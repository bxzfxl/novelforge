import type { ModelConfig, ChatResult, StreamChunk } from '@novelforge/shared'
import { createProvider } from './providers'
import { CostTracker } from './cost-tracker'

export class AIClient {
  private costTracker = new CostTracker()

  async generate(
    modelConfig: ModelConfig,
    messages: Array<{ role: string; content: string }>,
    opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}
  ): Promise<ChatResult> {
    const provider = createProvider(modelConfig)
    const start = Date.now()

    try {
      const result = await provider.chat(messages, {
        model: modelConfig.modelId,
        maxTokens: opts.maxTokens ?? modelConfig.maxTokens,
        temperature: opts.temperature ?? 0.7,
        signal: opts.signal,
      })
      this.costTracker.record(result, modelConfig.id, modelConfig.provider, '', undefined, Date.now() - start)
      return result
    } catch (e: any) {
      this.costTracker.recordError(modelConfig.id, modelConfig.provider, '', e.message)
      throw e
    }
  }

  async *generateStream(
    modelConfig: ModelConfig,
    messages: Array<{ role: string; content: string }>,
    opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}
  ): AsyncIterable<StreamChunk> {
    const provider = createProvider(modelConfig)
    let fullContent = ''
    let finalInputTokens = 0
    let finalOutputTokens = 0
    let finalCostUsd = 0

    for await (const chunk of provider.chatStream(messages, {
      model: modelConfig.modelId,
      maxTokens: opts.maxTokens ?? modelConfig.maxTokens,
      temperature: opts.temperature ?? 0.7,
      signal: opts.signal,
    })) {
      if (chunk.type === 'text') fullContent += chunk.content ?? ''
      if (chunk.type === 'done') {
        finalInputTokens = chunk.inputTokens ?? 0
        finalOutputTokens = chunk.outputTokens ?? 0
        finalCostUsd = chunk.costUsd ?? 0
      }
      yield chunk
    }

    this.costTracker.record(
      { content: fullContent, inputTokens: finalInputTokens, outputTokens: finalOutputTokens, costUsd: finalCostUsd, durationMs: 0 },
      modelConfig.id, modelConfig.provider, ''
    )
  }

  getTracker(): CostTracker { return this.costTracker }
}
