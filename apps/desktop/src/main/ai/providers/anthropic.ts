import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'

export class AnthropicProvider implements AIChatProvider {
  constructor(private config: ModelConfig) {}

  async chat(_messages: Array<{ role: string; content: string }>, _opts: any): Promise<ChatResult> {
    throw new Error('AnthropicProvider not yet implemented')
  }

  async *chatStream(_messages: Array<{ role: string; content: string }>, _opts: any): AsyncIterable<StreamChunk> {
    throw new Error('AnthropicProvider stream not yet implemented')
  }

  async models(): Promise<Array<{ id: string; name: string }>> {
    return [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ]
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true }
  }
}
