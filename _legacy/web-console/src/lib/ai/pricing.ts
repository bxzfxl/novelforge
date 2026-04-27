/**
 * Model pricing constants — single source of truth
 * Based on LLM-Price repo (https://github.com/syaoranwe/LLM-Price) as of 2026-04
 * All prices in USD per 1M tokens
 */

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'alibaba'
  | 'zhipu'
  | 'moonshot';

export type Mode = 'api' | 'cli';
export type Tier = 'flagship' | 'mid' | 'efficient' | 'reasoning';

export interface PricingEntry {
  targetId: string;                // "claude-opus-4-6:api"
  modelId: string;                 // "claude-opus-4-6"
  provider: ProviderId;
  mode: Mode;
  displayName: string;
  description: string;
  inputPricePer1M: number | null;  // null for CLI
  outputPricePer1M: number | null;
  cacheReadPricePer1M: number | null;
  cacheWrite5mPricePer1M: number | null;
  cacheWrite1hPricePer1M: number | null;
  contextWindow: number;
  maxOutputTokens: number;
  tier: Tier;
}

export const PRICING_TABLE: PricingEntry[] = [
  // ── Anthropic API ──
  {
    targetId: 'claude-opus-4-6:api',
    modelId: 'claude-opus-4-6',
    provider: 'anthropic',
    mode: 'api',
    displayName: 'Claude Opus 4.6 (API)',
    description: 'Anthropic 旗舰模型。强推理，适合指挥性任务（架构、规划、头脑风暴）。',
    inputPricePer1M: 5.00,
    outputPricePer1M: 25.00,
    cacheReadPricePer1M: 0.50,
    cacheWrite5mPricePer1M: 6.25,
    cacheWrite1hPricePer1M: 10.00,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'flagship',
  },
  {
    targetId: 'claude-sonnet-4-6:api',
    modelId: 'claude-sonnet-4-6',
    provider: 'anthropic',
    mode: 'api',
    displayName: 'Claude Sonnet 4.6 (API)',
    description: '近 Opus 性能，Sonnet 价格。适合质量敏感的执行任务（主写手、终审）。',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cacheReadPricePer1M: 0.30,
    cacheWrite5mPricePer1M: 3.75,
    cacheWrite1hPricePer1M: 6.00,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },
  {
    targetId: 'claude-haiku-4-5:api',
    modelId: 'claude-haiku-4-5',
    provider: 'anthropic',
    mode: 'api',
    displayName: 'Claude Haiku 4.5 (API)',
    description: 'Anthropic 最快速的模型，适合高频简单任务。',
    inputPricePer1M: 1.00,
    outputPricePer1M: 5.00,
    cacheReadPricePer1M: 0.10,
    cacheWrite5mPricePer1M: 1.25,
    cacheWrite1hPricePer1M: 2.00,
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },

  // ── OpenAI API ──
  {
    targetId: 'gpt-5.4:api',
    modelId: 'gpt-5.4',
    provider: 'openai',
    mode: 'api',
    displayName: 'GPT-5.4 (API)',
    description: 'OpenAI 旗舰。一百万 token 上下文，推理与代码能力强。',
    inputPricePer1M: 2.50,
    outputPricePer1M: 15.00,
    cacheReadPricePer1M: 0.25,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 16384,
    tier: 'flagship',
  },
  {
    targetId: 'gpt-5.4-mini:api',
    modelId: 'gpt-5.4-mini',
    provider: 'openai',
    mode: 'api',
    displayName: 'GPT-5.4 Mini (API)',
    description: '精简版 GPT-5.4，性价比好。',
    inputPricePer1M: 0.75,
    outputPricePer1M: 4.50,
    cacheReadPricePer1M: 0.075,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 400_000,
    maxOutputTokens: 16384,
    tier: 'mid',
  },
  {
    targetId: 'gpt-5-nano:api',
    modelId: 'gpt-5-nano',
    provider: 'openai',
    mode: 'api',
    displayName: 'GPT-5 Nano (API)',
    description: '极致便宜的 OpenAI 模型，适合大批量简单任务。',
    inputPricePer1M: 0.05,
    outputPricePer1M: 0.40,
    cacheReadPricePer1M: 0.005,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    tier: 'efficient',
  },

  // ── Google Gemini API ──
  {
    targetId: 'gemini-3.1-pro:api',
    modelId: 'gemini-3.1-pro-preview',
    provider: 'google',
    mode: 'api',
    displayName: 'Gemini 3.1 Pro Preview (API)',
    description: '2026-04 综合榜首，编程与推理两项领先。',
    inputPricePer1M: 2.00,
    outputPricePer1M: 12.00,
    cacheReadPricePer1M: 0.20,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    tier: 'flagship',
  },
  {
    targetId: 'gemini-2.5-pro:api',
    modelId: 'gemini-2.5-pro',
    provider: 'google',
    mode: 'api',
    displayName: 'Gemini 2.5 Pro (API)',
    description: '稳定版 Gemini Pro，长上下文。',
    inputPricePer1M: 1.25,
    outputPricePer1M: 10.00,
    cacheReadPricePer1M: 0.125,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },
  {
    targetId: 'gemini-2.5-flash:api',
    modelId: 'gemini-2.5-flash',
    provider: 'google',
    mode: 'api',
    displayName: 'Gemini 2.5 Flash (API)',
    description: '便宜快速，适合高频简单任务。',
    inputPricePer1M: 0.30,
    outputPricePer1M: 2.50,
    cacheReadPricePer1M: 0.03,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },
  {
    targetId: 'gemini-2.5-flash-lite:api',
    modelId: 'gemini-2.5-flash-lite',
    provider: 'google',
    mode: 'api',
    displayName: 'Gemini 2.5 Flash-Lite (API)',
    description: '极致便宜，适合大批量任务。',
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
    cacheReadPricePer1M: 0.01,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },

  // ── DeepSeek API ──
  {
    targetId: 'deepseek-chat:api',
    modelId: 'deepseek-chat',
    provider: 'deepseek',
    mode: 'api',
    displayName: 'DeepSeek V3.2 (API)',
    description: 'MIT 许可，性价比之王。适合大批量执行任务。',
    inputPricePer1M: 0.28,
    outputPricePer1M: 0.42,
    cacheReadPricePer1M: 0.028,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },
  {
    targetId: 'deepseek-reasoner:api',
    modelId: 'deepseek-reasoner',
    provider: 'deepseek',
    mode: 'api',
    displayName: 'DeepSeek R1 (API)',
    description: '推理模型，chain-of-thought 显式思考。便宜的强推理。',
    inputPricePer1M: 0.28,
    outputPricePer1M: 0.42,
    cacheReadPricePer1M: 0.028,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    tier: 'reasoning',
  },

  // ── Alibaba Qwen (Chinese-optimized) ──
  {
    targetId: 'qwen3-max:api',
    modelId: 'qwen3-max',
    provider: 'alibaba',
    mode: 'api',
    displayName: 'Qwen3-Max (API)',
    description: '阿里旗舰，中文文学表达强。注意内容审查。',
    inputPricePer1M: 0.36,
    outputPricePer1M: 1.43,
    cacheReadPricePer1M: 0.036,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },
  {
    targetId: 'qwen3.5-flash:api',
    modelId: 'qwen3.5-flash',
    provider: 'alibaba',
    mode: 'api',
    displayName: 'Qwen3.5-Flash (API)',
    description: 'Qwen 系列最便宜，适合中文大批量任务。注意内容审查。',
    inputPricePer1M: 0.029,
    outputPricePer1M: 0.286,
    cacheReadPricePer1M: 0.003,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },

  // ── Zhipu GLM (Chinese-optimized) ──
  {
    targetId: 'glm-5:api',
    modelId: 'glm-5',
    provider: 'zhipu',
    mode: 'api',
    displayName: 'GLM-5 (API)',
    description: '清华系智谱 AI，中文能力强。注意内容审查。',
    inputPricePer1M: 0.57,
    outputPricePer1M: 2.57,
    cacheReadPricePer1M: 0.057,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },

  // ── Moonshot Kimi ──
  {
    targetId: 'kimi-k2.5:api',
    modelId: 'kimi-k2.5',
    provider: 'moonshot',
    mode: 'api',
    displayName: 'Kimi K2.5 (API)',
    description: '月之暗面，长上下文 200k，中文强。注意内容审查。',
    inputPricePer1M: 0.57,
    outputPricePer1M: 3.00,
    cacheReadPricePer1M: 0.10,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },

  // ── CLI targets (no pricing) ──
  {
    targetId: 'claude-opus-4-6:cli',
    modelId: 'claude-opus-4-6',
    provider: 'anthropic',
    mode: 'cli',
    displayName: 'Claude Opus 4.6 (CLI)',
    description: '通过本机 claude CLI 调用，使用 Claude Max 订阅，按 token 记录用量但成本计 0。',
    inputPricePer1M: null,
    outputPricePer1M: null,
    cacheReadPricePer1M: null,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'flagship',
  },
  {
    targetId: 'claude-sonnet-4-6:cli',
    modelId: 'claude-sonnet-4-6',
    provider: 'anthropic',
    mode: 'cli',
    displayName: 'Claude Sonnet 4.6 (CLI)',
    description: '通过本机 claude CLI 调用。',
    inputPricePer1M: null,
    outputPricePer1M: null,
    cacheReadPricePer1M: null,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'mid',
  },
  {
    targetId: 'claude-haiku-4-5:cli',
    modelId: 'claude-haiku-4-5',
    provider: 'anthropic',
    mode: 'cli',
    displayName: 'Claude Haiku 4.5 (CLI)',
    description: '通过本机 claude CLI 调用。',
    inputPricePer1M: null,
    outputPricePer1M: null,
    cacheReadPricePer1M: null,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },
  {
    targetId: 'gemini-3.1-pro:cli',
    modelId: 'gemini-3.1-pro-preview',
    provider: 'google',
    mode: 'cli',
    displayName: 'Gemini 3.1 Pro (CLI)',
    description: '通过本机 gemini CLI 调用。',
    inputPricePer1M: null,
    outputPricePer1M: null,
    cacheReadPricePer1M: null,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    tier: 'flagship',
  },
  {
    targetId: 'gemini-2.5-flash:cli',
    modelId: 'gemini-2.5-flash',
    provider: 'google',
    mode: 'cli',
    displayName: 'Gemini 2.5 Flash (CLI)',
    description: '通过本机 gemini CLI 调用。',
    inputPricePer1M: null,
    outputPricePer1M: null,
    cacheReadPricePer1M: null,
    cacheWrite5mPricePer1M: null,
    cacheWrite1hPricePer1M: null,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    tier: 'efficient',
  },
];

/** Compute cost for a single call based on pricing entry and usage */
export function computeCost(
  entry: PricingEntry,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  },
): number {
  // CLI mode: no cost
  if (entry.inputPricePer1M === null || entry.outputPricePer1M === null) {
    return 0;
  }

  const nonCachedInput = usage.inputTokens - (usage.cacheReadTokens ?? 0);
  const inputCost = (nonCachedInput * entry.inputPricePer1M) / 1_000_000;
  const outputCost = (usage.outputTokens * entry.outputPricePer1M) / 1_000_000;

  const cacheReadCost = usage.cacheReadTokens && entry.cacheReadPricePer1M
    ? (usage.cacheReadTokens * entry.cacheReadPricePer1M) / 1_000_000
    : 0;

  const cacheWriteCost = usage.cacheWriteTokens && entry.cacheWrite5mPricePer1M
    ? (usage.cacheWriteTokens * entry.cacheWrite5mPricePer1M) / 1_000_000
    : 0;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/** Get pricing entry by target ID */
export function getPricingEntry(targetId: string): PricingEntry | undefined {
  return PRICING_TABLE.find((e) => e.targetId === targetId);
}
