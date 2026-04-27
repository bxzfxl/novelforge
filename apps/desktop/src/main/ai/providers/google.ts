import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class GoogleProvider implements AIChatProvider {
  private client: GoogleGenerativeAI

  constructor(private config: ModelConfig) {
    this.client = new GoogleGenerativeAI(decryptApiKey(config.apiKey))
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const model = this.client.getGenerativeModel({
      model: opts.model ?? this.config.modelId,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
        temperature: opts.temperature ?? 0.7,
      },
    })

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const result = await model.generateContent({ contents })
    const text = result.response.text()

    return {
      content: text,
      inputTokens: 0,
      outputTokens: Math.ceil(text.length / 4),
      costUsd: 0,
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const model = this.client.getGenerativeModel({
      model: opts.model ?? this.config.modelId,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
        temperature: opts.temperature ?? 0.7,
      },
    })

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const result = await model.generateContentStream({ contents })

    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      yield { type: 'text', content: text }
    }
    yield { type: 'done', inputTokens: 0, outputTokens: Math.ceil(fullText.length / 4), costUsd: 0 }
  }

  async models() {
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ]
  }

  async validate() {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.modelId })
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
      result.response.text()
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }
}
