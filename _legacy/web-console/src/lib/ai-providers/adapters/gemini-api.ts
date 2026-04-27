import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';
import { getPricingEntry, computeCost } from '@/lib/ai/pricing';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiAPIAdapter implements ProviderAdapter {
  id = 'google-api';
  mode = 'api' as const;
  supportedProviders = ['google'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const key = getConfig('gemini_api_key');
    if (!key) return { available: false, reason: 'Gemini API Key 未配置' };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('google', null, `Unknown target: ${params.targetId}`);

    const apiKey = getConfig('gemini_api_key');
    if (!apiKey) throw new ProviderAPIError('google', 401, 'API Key 未配置');

    const url = `${BASE_URL}/${target.model_id}:generateContent?key=${apiKey}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const m of params.messages) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
        temperature: params.temperature,
      },
    };

    if (params.systemPrompt) {
      body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError(
        'google',
        null,
        err instanceof Error ? err.message : String(err),
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError('google', response.status, text);
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        cachedContentTokenCount?: number;
      };
    };

    const content = data.candidates[0]?.content.parts.map((p) => p.text).join('') ?? '';

    const usage: Usage = {
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
      cacheReadTokens: data.usageMetadata.cachedContentTokenCount ?? 0,
      cacheWriteTokens: 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.candidates[0]?.finishReason === 'STOP' ? 'stop' : 'length',
      rawResponse: data,
    };
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
