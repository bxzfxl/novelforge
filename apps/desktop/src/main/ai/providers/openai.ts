import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'

export class OpenAIProvider implements AIChatProvider {
  constructor(private config: ModelConfig) {}

  async chat(messages: Array<{ role: string; content: string }>, _opts: any): Promise<ChatResult> {
    throw new Error('OpenAIProvider not yet implemented')
  }

  async *chatStream(_messages: Array<{ role: string; content: string }>, _opts: any): AsyncIterable<StreamChunk> {
    throw new Error('OpenAIProvider stream not yet implemented')
  }

  async models(): Promise<Array<{ id: string; name: string }>> {
    return []
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true }
  }
}
