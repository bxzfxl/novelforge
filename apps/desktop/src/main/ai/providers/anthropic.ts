import Anthropic from '@anthropic-ai/sdk'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class AnthropicProvider implements AIChatProvider {
  private client: Anthropic

  constructor(private config: ModelConfig) {
    this.client = new Anthropic({ apiKey: decryptApiKey(config.apiKey) })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const systemMsg = messages.find(m => m.role === 'system')?.content
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const resp = await this.client.messages.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      system: systemMsg,
      messages: userMsgs,
    }, { signal: opts.signal })

    const inputTokens = resp.usage.input_tokens
    const outputTokens = resp.usage.output_tokens
    const costUsd = this.computeCost(inputTokens, outputTokens)

    return {
      content: resp.content.map(b => (b.type === 'text' ? b.text : '')).join(''),
      inputTokens,
      outputTokens,
      costUsd,
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const systemMsg = messages.find(m => m.role === 'system')?.content
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = this.client.messages.stream({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      system: systemMsg,
      messages: userMsgs,
    })

    let inputTokens = 0
    let outputTokens = 0

    for await (const event of stream) {
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', content: event.delta.text }
      }
      if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens
      }
    }

    const costUsd = this.computeCost(inputTokens, outputTokens)
    yield { type: 'done', inputTokens, outputTokens, costUsd }
  }

  async models() {
    return [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ]
  }

  async validate() {
    try {
      await this.client.messages.create({
        model: this.config.modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      })
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  private computeCost(inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { in: number; out: number }> = {
      'claude-sonnet-4-6': { in: 3, out: 15 },
      'claude-opus-4-7': { in: 15, out: 75 },
      'claude-haiku-4-5': { in: 0.8, out: 4 },
    }
    const p = pricing[this.config.modelId] ?? { in: 3, out: 15 }
    return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out
  }
}
