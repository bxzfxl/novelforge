import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'

export class OpenAICompatibleProvider implements AIChatProvider {
  constructor(private config: ModelConfig) {}

  async chat(_messages: Array<{ role: string; content: string }>, _opts: any): Promise<ChatResult> {
    throw new Error('OpenAICompatibleProvider not yet implemented')
  }

  async *chatStream(_messages: Array<{ role: string; content: string }>, _opts: any): AsyncIterable<StreamChunk> {
    throw new Error('OpenAICompatibleProvider stream not yet implemented')
  }

  async models(): Promise<Array<{ id: string; name: string }>> {
    return []
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true }
  }
}
