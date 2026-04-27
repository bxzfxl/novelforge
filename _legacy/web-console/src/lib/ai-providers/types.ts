/**
 * Shared interfaces for AI providers and execution layer.
 */

export type Mode = 'api' | 'cli';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExecuteParams {
  targetId: string;
  operationId: string;
  systemPrompt?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  cacheBreakpoints?: Array<{ messageIndex: number }>;
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ExecuteResult {
  content: string;
  usage: Usage;
  costUsd: number;
  wasCliMode: boolean;
  rawResponse?: unknown;
  finishReason: 'stop' | 'length' | 'error';
}

export type StreamChunk =
  | { type: 'content'; delta: string }
  | { type: 'usage'; usage: Usage }
  | { type: 'done' }
  | { type: 'error'; error: string };

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
}

export interface ProviderAdapter {
  id: string;
  mode: Mode;
  /** 该适配器支持的 provider 列表（对应 pricing table 中的 provider 字段） */
  supportedProviders: string[];
  detectAvailability(targetId: string): Promise<AvailabilityCheckResult>;
  execute(params: ExecuteParams): Promise<ExecuteResult>;
  stream(params: ExecuteParams): AsyncIterable<StreamChunk>;
}

/** Budget state returned by checkBudget / enforceBudget */
export type BudgetState =
  | { level: 'ok' }
  | { level: 'warn'; pct: number; budget: number; todayCost: number }
  | { level: 'soft_block'; pct: number; budget: number; todayCost: number }
  | { level: 'hard_block'; pct: number; budget: number; todayCost: number };
