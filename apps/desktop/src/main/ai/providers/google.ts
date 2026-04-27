import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'

export class GoogleProvider implements AIChatProvider {
  constructor(private config: ModelConfig) {}

  async chat(_messages: Array<{ role: string; content: string }>, _opts: any): Promise<ChatResult> {
    throw new Error('GoogleProvider not yet implemented')
  }

  async *chatStream(_messages: Array<{ role: string; content: string }>, _opts: any): AsyncIterable<StreamChunk> {
    throw new Error('GoogleProvider stream not yet implemented')
  }

  async models(): Promise<Array<{ id: string; name: string }>> {
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ]
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true }
  }
}
