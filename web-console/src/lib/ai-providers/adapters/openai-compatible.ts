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

/**
 * Unified adapter for OpenAI-compatible providers:
 * - OpenAI: https://api.openai.com/v1/chat/completions
 * - DeepSeek: https://api.deepseek.com/chat/completions
 * - Alibaba Qwen: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
 * - Zhipu GLM: https://open.bigmodel.cn/api/paas/v4/chat/completions
 * - Moonshot Kimi: https://api.moonshot.cn/v1/chat/completions
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  id = 'openai-compatible-api';
  mode = 'api' as const;
  supportedProviders = ['openai', 'deepseek', 'alibaba', 'zhipu', 'moonshot'];

  private endpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    moonshot: 'https://api.moonshot.cn/v1/chat/completions',
  };

  private apiKeyConfigKeys: Record<string, string> = {
    openai: 'openai_api_key',
    deepseek: 'deepseek_api_key',
    alibaba: 'alibaba_api_key',
    zhipu: 'zhipu_api_key',
    moonshot: 'moonshot_api_key',
  };

  async detectAvailability(targetId: string): Promise<AvailabilityCheckResult> {
    const target = getModelTarget(targetId);
    if (!target) return { available: false, reason: 'target 不存在' };
    const keyName = this.apiKeyConfigKeys[target.provider];
    if (!keyName) return { available: false, reason: `未知 provider: ${target.provider}` };
    const key = getConfig(keyName);
    if (!key) return { available: false, reason: `${target.provider} API Key 未配置` };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('unknown', null, `Unknown target: ${params.targetId}`);

    const endpoint = this.endpoints[target.provider];
    if (!endpoint) {
      throw new ProviderAPIError(target.provider, null, `No endpoint for provider ${target.provider}`);
    }

    const apiKey = getConfig(this.apiKeyConfigKeys[target.provider]);
    if (!apiKey) throw new ProviderAPIError(target.provider, 401, 'API Key 未配置');

    const messages: Array<{ role: string; content: string }> = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(...params.messages.map((m) => ({ role: m.role, content: m.content })));

    const body = {
      model: target.model_id,
      messages,
      max_tokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
      temperature: params.temperature,
      stream: false,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError(
        target.provider,
        null,
        err instanceof Error ? err.message : String(err),
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError(target.provider, response.status, text);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
      };
    };

    const content = data.choices[0]?.message.content ?? '';

    const usage: Usage = {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      cacheReadTokens: data.usage.prompt_cache_hit_tokens ?? 0,
      cacheWriteTokens: 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
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
