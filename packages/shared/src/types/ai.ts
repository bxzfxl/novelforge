export type AIProviderType =
  | 'anthropic' | 'google' | 'openai' | 'openai-compatible' | 'custom'

export interface ModelConfig {
  id: string
  provider: AIProviderType
  displayName: string
  apiKey: string
  baseURL?: string
  modelId: string
  maxTokens?: number
  maxConcurrency?: number
  tags: string[]
  enabled: boolean
}

export interface RoleModelBinding {
  roleId: string
  primaryModelId: string
  fallbackModelId?: string
}

export interface AICallLog {
  id: string
  pipelineRunId?: string
  role: string
  modelId: string
  provider: AIProviderType
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
  status: 'success' | 'error'
  error?: string
  createdAt: string
}

export interface PromptTemplate {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  config: {
    model?: string
    maxTokens?: number
    temperature?: number
  }
}

export interface ChatResult {
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content?: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  error?: string
}

export interface AIChatProvider {
  chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult>

  chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk>

  models(): Promise<Array<{ id: string; name: string }>>
  validate(): Promise<{ valid: boolean; error?: string }>
}
