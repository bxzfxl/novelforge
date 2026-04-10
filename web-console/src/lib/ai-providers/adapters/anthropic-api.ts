import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget } from '@/lib/db/queries';
import { getPricingEntry, computeCost } from '@/lib/ai/pricing';
import { getConfig } from '@/lib/db/queries';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicAPIAdapter implements ProviderAdapter {
  id = 'anthropic-api';
  mode = 'api' as const;
  supportedProviders = ['anthropic'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const key = getConfig('anthropic_api_key');
    if (!key) return { available: false, reason: 'Anthropic API Key 未配置' };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('anthropic', null, `Unknown target: ${params.targetId}`);

    const apiKey = getConfig('anthropic_api_key');
    if (!apiKey) throw new ProviderAPIError('anthropic', 401, 'API Key 未配置');

    const body = {
      model: target.model_id,
      max_tokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    };

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError('anthropic', null, err instanceof Error ? err.message : String(err));
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError('anthropic', response.status, text);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
      stop_reason: string;
    };

    const content = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    const usage: Usage = {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      cacheReadTokens: data.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: data.usage.cache_creation_input_tokens ?? 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      rawResponse: data,
    };
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    // Phase 1: non-streaming fallback. Upgrade to SSE in a later task if needed.
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
