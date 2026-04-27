import OpenAI from 'openai'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class OpenAIProvider implements AIChatProvider {
  private client: OpenAI

  constructor(private config: ModelConfig) {
    this.client = new OpenAI({ apiKey: decryptApiKey(config.apiKey) })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const resp = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
    }, { signal: opts.signal })

    const inputTokens = resp.usage?.prompt_tokens ?? 0
    const outputTokens = resp.usage?.completion_tokens ?? 0
    return {
      content: resp.choices[0]?.message?.content ?? '',
      inputTokens,
      outputTokens,
      costUsd: this.computeCost(inputTokens, outputTokens),
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      stream: true,
    }, { signal: opts.signal })

    let content = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      content += delta
      yield { type: 'text', content: delta }
    }

    const estimateOutputTokens = Math.ceil(content.length / 4)
    yield { type: 'done', inputTokens: 0, outputTokens: estimateOutputTokens, costUsd: 0 }
  }

  async models() {
    const resp = await this.client.models.list()
    return resp.data.map(m => ({ id: m.id, name: m.id }))
  }

  async validate() {
    try {
      await this.client.models.list()
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  private computeCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10
  }
}
