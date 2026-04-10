# Feature 1: Model Config Refactor + Usage Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor NovelForge from "per-provider config" to "per-AI-operation config" with 19 operations, 8 providers (API + CLI modes), full cost tracking, budget alerts, and failure snapshots.

**Architecture:** Unified `runOperation(opId, params)` entry point resolves operation → model_target (via category inheritance + override), dispatches to a provider adapter (AnthropicAPI/OpenAI-compatible/Gemini/Claude-CLI/Gemini-CLI), records token usage with cost, enforces tiered budget thresholds (80/100/120%), and on failure creates a snapshot (DB metadata + file payload) for manual resume.

**Tech Stack:** TypeScript strict mode, Next.js 16 App Router, better-sqlite3, Zustand, Socket.IO (Remote Agent), vitest (new), shadcn/ui.

**Spec:** [`docs/superpowers/specs/2026-04-10-model-config-refactor-design.md`](../specs/2026-04-10-model-config-refactor-design.md)

---

## File Structure Overview

### New Files

**Database layer:**
- `web-console/src/lib/db/migrations/002_ai_operations.sql` — schema migration
- `web-console/src/lib/db/seed-model-targets.ts` — seed ~30 model targets
- `web-console/src/lib/db/seed-operations.ts` — seed 19 operations

**Core AI layer:**
- `web-console/src/lib/ai-providers/types.ts` — shared interfaces
- `web-console/src/lib/ai-providers/errors.ts` — custom error classes
- `web-console/src/lib/ai-providers/factory.ts` — adapter registry
- `web-console/src/lib/ai-providers/adapters/anthropic-api.ts`
- `web-console/src/lib/ai-providers/adapters/openai-compatible.ts` — base for OpenAI/DeepSeek/Qwen/Zhipu/Moonshot
- `web-console/src/lib/ai-providers/adapters/gemini-api.ts`
- `web-console/src/lib/ai-providers/adapters/claude-cli.ts`
- `web-console/src/lib/ai-providers/adapters/gemini-cli.ts`
- `web-console/src/lib/ai-providers/adapters/index.ts` — register all adapters
- `web-console/src/lib/ai/resolve-target.ts` — `resolveOperationTarget()`
- `web-console/src/lib/ai/budget.ts` — `enforceBudget()` + `checkBudget()`
- `web-console/src/lib/ai/run-operation.ts` — `runOperation()` + `runOperationStream()`
- `web-console/src/lib/ai/snapshots.ts` — `createFailureSnapshot()` + `resumeSnapshot()`
- `web-console/src/lib/ai/presets.ts` — 6 preset definitions + `applyPreset()`
- `web-console/src/lib/ai/pricing.ts` — model pricing constant table

**API routes:**
- `web-console/src/app/api/operation/run/route.ts`
- `web-console/src/app/api/operations/route.ts`
- `web-console/src/app/api/operations/[id]/route.ts`
- `web-console/src/app/api/targets/route.ts`
- `web-console/src/app/api/targets/detect/route.ts`
- `web-console/src/app/api/targets/refresh-pricing/route.ts`
- `web-console/src/app/api/snapshots/route.ts`
- `web-console/src/app/api/snapshots/[id]/resume/route.ts`
- `web-console/src/app/api/budget/route.ts`
- `web-console/src/app/api/budget/check/route.ts`
- `web-console/src/app/api/usage/summary/route.ts`
- `web-console/src/app/api/usage/by-operation/route.ts`
- `web-console/src/app/api/usage/timeseries/route.ts`
- `web-console/src/app/api/presets/route.ts`

**UI components:**
- `web-console/src/app/usage/page.tsx`
- `web-console/src/components/settings/operations-tab.tsx`
- `web-console/src/components/settings/credentials-tab.tsx`
- `web-console/src/components/settings/budget-tab.tsx`
- `web-console/src/components/settings/preset-modal.tsx`
- `web-console/src/components/settings/operation-card.tsx`
- `web-console/src/components/settings/model-select.tsx`
- `web-console/src/components/usage/overview-cards.tsx`
- `web-console/src/components/usage/budget-bar.tsx`
- `web-console/src/components/usage/operation-breakdown.tsx`
- `web-console/src/components/usage/time-series-chart.tsx`
- `web-console/src/components/usage/snapshots-table.tsx`
- `web-console/src/components/usage/per-op-estimate.tsx`
- `web-console/src/stores/settings-store.ts`

**Scripts:**
- `scripts/migrate-to-operations.ts`

**Tests:**
- `web-console/src/**/__tests__/*.test.ts` — colocated unit tests
- `web-console/vitest.config.ts`

### Modified Files

- `web-console/package.json` — add vitest + testing-library dependencies
- `web-console/src/lib/db/schema.ts` — add new table definitions
- `web-console/src/lib/db/queries.ts` — add new query functions
- `web-console/src/app/settings/page.tsx` — rewrite as 3-tab layout
- `scripts/writers-room.sh` — route through `/api/operation/run` instead of direct CLI

---

## Phase 1.A: Foundation & Database (Tasks 1-8)

### Task 1: Install and configure vitest

**Files:**
- Modify: `web-console/package.json`
- Create: `web-console/vitest.config.ts`
- Create: `web-console/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Install vitest and testing libraries**

Run from `D:/codeProgram/novelforge/novelforge`:
```bash
pnpm --filter web-console add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

- [ ] **Step 2: Create `web-console/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add test scripts to `web-console/package.json`**

Add inside `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Create smoke test `web-console/src/__tests__/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest is set up correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run smoke test**

```bash
cd web-console && pnpm test
```
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add web-console/package.json web-console/pnpm-lock.yaml web-console/vitest.config.ts web-console/src/__tests__/smoke.test.ts
git commit -m "test: install vitest and add smoke test"
```

---

### Task 2: Define pricing constants table

**Files:**
- Create: `web-console/src/lib/ai/pricing.ts`
- Create: `web-console/src/lib/ai/__tests__/pricing.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/pricing.ts`**

```ts
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
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/pricing.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PRICING_TABLE, computeCost, getPricingEntry } from '../pricing';

describe('pricing table', () => {
  it('has unique target IDs', () => {
    const ids = PRICING_TABLE.map((e) => e.targetId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('CLI entries have null pricing', () => {
    const cliEntries = PRICING_TABLE.filter((e) => e.mode === 'cli');
    expect(cliEntries.length).toBeGreaterThan(0);
    for (const e of cliEntries) {
      expect(e.inputPricePer1M).toBeNull();
      expect(e.outputPricePer1M).toBeNull();
    }
  });

  it('API entries have non-null pricing', () => {
    const apiEntries = PRICING_TABLE.filter((e) => e.mode === 'api');
    expect(apiEntries.length).toBeGreaterThan(0);
    for (const e of apiEntries) {
      expect(e.inputPricePer1M).not.toBeNull();
      expect(e.outputPricePer1M).not.toBeNull();
    }
  });
});

describe('computeCost', () => {
  const sonnet = getPricingEntry('claude-sonnet-4-6:api')!;

  it('calculates basic cost correctly', () => {
    // 1000 input @ $3/M + 500 output @ $15/M = $0.003 + $0.0075 = $0.0105
    const cost = computeCost(sonnet, { inputTokens: 1000, outputTokens: 500 });
    expect(cost).toBeCloseTo(0.0105, 4);
  });

  it('subtracts cache reads from input cost', () => {
    // 1000 input, 600 of which are cache reads
    // Non-cached: 400 * $3/M = $0.0012
    // Cache read: 600 * $0.30/M = $0.00018
    // Output: 0
    const cost = computeCost(sonnet, {
      inputTokens: 1000,
      outputTokens: 0,
      cacheReadTokens: 600,
    });
    expect(cost).toBeCloseTo(0.0012 + 0.00018, 5);
  });

  it('returns 0 for CLI entries', () => {
    const opusCli = getPricingEntry('claude-opus-4-6:cli')!;
    const cost = computeCost(opusCli, { inputTokens: 10000, outputTokens: 5000 });
    expect(cost).toBe(0);
  });

  it('handles DeepSeek extra-cheap pricing', () => {
    const deepseek = getPricingEntry('deepseek-chat:api')!;
    // 10000 input @ $0.28/M + 5000 output @ $0.42/M
    const cost = computeCost(deepseek, { inputTokens: 10000, outputTokens: 5000 });
    expect(cost).toBeCloseTo(0.0028 + 0.0021, 5);
  });
});

describe('getPricingEntry', () => {
  it('finds claude-opus-4-6:api', () => {
    const entry = getPricingEntry('claude-opus-4-6:api');
    expect(entry).toBeDefined();
    expect(entry?.tier).toBe('flagship');
  });

  it('returns undefined for unknown ID', () => {
    expect(getPricingEntry('unknown:api')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test pricing
```
Expected: 8 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/pricing.ts web-console/src/lib/ai/__tests__/pricing.test.ts
git commit -m "feat(ai): pricing constant table for 24 model targets"
```

---

### Task 3: Database schema migration

**Files:**
- Modify: `web-console/src/lib/db/schema.ts`
- Create: `web-console/src/lib/db/migrations/002_ai_operations.sql`

- [ ] **Step 1: Create migration SQL file `web-console/src/lib/db/migrations/002_ai_operations.sql`**

```sql
-- Migration 002: AI Operations + Model Targets + Budget + Snapshots

-- ① Model targets (model × mode combinations)
CREATE TABLE IF NOT EXISTS model_targets (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('api', 'cli')),
  display_name TEXT NOT NULL,
  description TEXT,
  input_price_per_1m REAL,
  output_price_per_1m REAL,
  cache_read_price_per_1m REAL,
  cache_write_5m_price_per_1m REAL,
  cache_write_1h_price_per_1m REAL,
  context_window INTEGER,
  max_output_tokens INTEGER,
  available INTEGER NOT NULL DEFAULT 0,
  availability_reason TEXT,
  last_checked_at TEXT,
  tier TEXT CHECK(tier IN ('flagship','mid','efficient','reasoning')),
  price_manually_edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ② AI operations
CREATE TABLE IF NOT EXISTS ai_operations (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_tier TEXT,
  recommended_rationale TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ③ Category-level defaults
CREATE TABLE IF NOT EXISTS operation_category_defaults (
  category TEXT PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ④ Operation-level overrides
CREATE TABLE IF NOT EXISTS operation_overrides (
  operation_id TEXT PRIMARY KEY REFERENCES ai_operations(id),
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑤ Budget config (single row)
CREATE TABLE IF NOT EXISTS budget_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL DEFAULT 0,
  warn_threshold_pct INTEGER NOT NULL DEFAULT 80,
  soft_block_threshold_pct INTEGER NOT NULL DEFAULT 100,
  hard_block_threshold_pct INTEGER NOT NULL DEFAULT 120,
  fallback_target_id TEXT REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑥ Pipeline snapshots
CREATE TABLE IF NOT EXISTS pipeline_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  attempted_target_id TEXT NOT NULL,
  failure_category TEXT NOT NULL CHECK(failure_category IN ('transient','permanent','unknown')),
  failure_message TEXT NOT NULL,
  payload_file_path TEXT NOT NULL,
  ai_summary TEXT,
  resume_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resumed','abandoned')),
  resumed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ⑦ Extend token_usage with cost tracking
ALTER TABLE token_usage ADD COLUMN target_id TEXT REFERENCES model_targets(id);
ALTER TABLE token_usage ADD COLUMN operation_id TEXT REFERENCES ai_operations(id);
ALTER TABLE token_usage ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN was_cli_mode INTEGER NOT NULL DEFAULT 0;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_operation_id ON token_usage(operation_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_target_id ON token_usage(target_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON pipeline_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_operations_category ON ai_operations(category);
```

- [ ] **Step 2: Modify `web-console/src/lib/db/schema.ts` to include new tables**

Find the `export const SCHEMA = \`` template literal and append all 6 new `CREATE TABLE IF NOT EXISTS` statements from the migration file (not the ALTER statements — those only run for existing DBs).

Add this block AFTER the existing `token_usage` table definition and BEFORE the closing backtick:

```ts
CREATE TABLE IF NOT EXISTS model_targets (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('api', 'cli')),
  display_name TEXT NOT NULL,
  description TEXT,
  input_price_per_1m REAL,
  output_price_per_1m REAL,
  cache_read_price_per_1m REAL,
  cache_write_5m_price_per_1m REAL,
  cache_write_1h_price_per_1m REAL,
  context_window INTEGER,
  max_output_tokens INTEGER,
  available INTEGER NOT NULL DEFAULT 0,
  availability_reason TEXT,
  last_checked_at TEXT,
  tier TEXT CHECK(tier IN ('flagship','mid','efficient','reasoning')),
  price_manually_edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_operations (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_tier TEXT,
  recommended_rationale TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operation_category_defaults (
  category TEXT PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operation_overrides (
  operation_id TEXT PRIMARY KEY REFERENCES ai_operations(id),
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budget_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL DEFAULT 0,
  warn_threshold_pct INTEGER NOT NULL DEFAULT 80,
  soft_block_threshold_pct INTEGER NOT NULL DEFAULT 100,
  hard_block_threshold_pct INTEGER NOT NULL DEFAULT 120,
  fallback_target_id TEXT REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  attempted_target_id TEXT NOT NULL,
  failure_category TEXT NOT NULL CHECK(failure_category IN ('transient','permanent','unknown')),
  failure_message TEXT NOT NULL,
  payload_file_path TEXT NOT NULL,
  ai_summary TEXT,
  resume_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resumed','abandoned')),
  resumed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_token_usage_operation_id ON token_usage(operation_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_target_id ON token_usage(target_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON pipeline_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_operations_category ON ai_operations(category);
```

- [ ] **Step 3: Add ALTER TABLE runner to `web-console/src/lib/db/index.ts`**

Find the `initDb()` function and add a `runMigration002()` call after `SCHEMA` is executed.

Add this function:

```ts
/**
 * Migration 002: extend token_usage with cost tracking columns.
 * Uses PRAGMA table_info to detect existing columns and only adds missing ones.
 */
function runMigration002(db: Database.Database) {
  const existingCols = db.prepare('PRAGMA table_info(token_usage)').all() as { name: string }[];
  const colNames = new Set(existingCols.map((c) => c.name));

  const additions = [
    { name: 'target_id', sql: 'ALTER TABLE token_usage ADD COLUMN target_id TEXT REFERENCES model_targets(id)' },
    { name: 'operation_id', sql: 'ALTER TABLE token_usage ADD COLUMN operation_id TEXT REFERENCES ai_operations(id)' },
    { name: 'cost_usd', sql: 'ALTER TABLE token_usage ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0' },
    { name: 'cache_read_tokens', sql: 'ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0' },
    { name: 'cache_write_tokens', sql: 'ALTER TABLE token_usage ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0' },
    { name: 'was_cli_mode', sql: 'ALTER TABLE token_usage ADD COLUMN was_cli_mode INTEGER NOT NULL DEFAULT 0' },
  ];

  for (const { name, sql } of additions) {
    if (!colNames.has(name)) {
      db.exec(sql);
    }
  }
}
```

Then in `initDb()`, call `runMigration002(db)` right after `db.exec(SCHEMA)`.

- [ ] **Step 4: Write DB schema test `web-console/src/lib/db/__tests__/schema.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// We test schema by loading it directly into an in-memory DB
describe('migration 002 schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates all new tables', () => {
    // First run base schema from schema.ts
    const { SCHEMA } = require('../schema');
    db.exec(SCHEMA);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain('model_targets');
    expect(names).toContain('ai_operations');
    expect(names).toContain('operation_category_defaults');
    expect(names).toContain('operation_overrides');
    expect(names).toContain('budget_config');
    expect(names).toContain('pipeline_snapshots');
  });

  it('enforces mode CHECK constraint', () => {
    const { SCHEMA } = require('../schema');
    db.exec(SCHEMA);

    expect(() => {
      db.prepare(
        `INSERT INTO model_targets (id, model_id, provider, mode, display_name)
         VALUES ('test', 'test', 'anthropic', 'invalid-mode', 'Test')`,
      ).run();
    }).toThrow();
  });

  it('enforces budget_config single-row constraint', () => {
    const { SCHEMA } = require('../schema');
    db.exec(SCHEMA);

    db.prepare('INSERT INTO budget_config (id, daily_budget_usd) VALUES (1, 5.0)').run();
    expect(() => {
      db.prepare('INSERT INTO budget_config (id, daily_budget_usd) VALUES (2, 10.0)').run();
    }).toThrow();
  });
});
```

- [ ] **Step 5: Run schema tests**

```bash
cd web-console && pnpm test schema
```
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add web-console/src/lib/db/schema.ts web-console/src/lib/db/index.ts web-console/src/lib/db/migrations/002_ai_operations.sql web-console/src/lib/db/__tests__/schema.test.ts
git commit -m "feat(db): add model_targets/operations/snapshots/budget tables"
```

---

### Task 4: Seed model_targets from pricing table

**Files:**
- Create: `web-console/src/lib/db/seed-model-targets.ts`
- Create: `web-console/src/lib/db/__tests__/seed-model-targets.test.ts`
- Modify: `web-console/src/lib/db/index.ts` (call seed on startup)

- [ ] **Step 1: Create `web-console/src/lib/db/seed-model-targets.ts`**

```ts
import type Database from 'better-sqlite3';
import { PRICING_TABLE } from '@/lib/ai/pricing';

/**
 * Seed model_targets table from pricing constants.
 * Idempotent: uses INSERT OR REPLACE, but respects price_manually_edited=1 rows.
 */
export function seedModelTargets(db: Database.Database): number {
  const insert = db.prepare(`
    INSERT INTO model_targets (
      id, model_id, provider, mode, display_name, description,
      input_price_per_1m, output_price_per_1m, cache_read_price_per_1m,
      cache_write_5m_price_per_1m, cache_write_1h_price_per_1m,
      context_window, max_output_tokens, tier, available, price_manually_edited
    ) VALUES (
      @targetId, @modelId, @provider, @mode, @displayName, @description,
      @inputPricePer1M, @outputPricePer1M, @cacheReadPricePer1M,
      @cacheWrite5mPricePer1M, @cacheWrite1hPricePer1M,
      @contextWindow, @maxOutputTokens, @tier, 0, 0
    )
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      description = excluded.description,
      context_window = excluded.context_window,
      max_output_tokens = excluded.max_output_tokens,
      tier = excluded.tier,
      updated_at = datetime('now')
    WHERE price_manually_edited = 0
  `);

  const refreshPrices = db.prepare(`
    UPDATE model_targets SET
      input_price_per_1m = @inputPricePer1M,
      output_price_per_1m = @outputPricePer1M,
      cache_read_price_per_1m = @cacheReadPricePer1M,
      cache_write_5m_price_per_1m = @cacheWrite5mPricePer1M,
      cache_write_1h_price_per_1m = @cacheWrite1hPricePer1M,
      updated_at = datetime('now')
    WHERE id = @targetId AND price_manually_edited = 0
  `);

  let count = 0;
  const txn = db.transaction(() => {
    for (const entry of PRICING_TABLE) {
      insert.run(entry);
      refreshPrices.run(entry);
      count++;
    }
  });
  txn();

  return count;
}
```

- [ ] **Step 2: Wire seed call into `initDb()` in `web-console/src/lib/db/index.ts`**

Add import at the top:
```ts
import { seedModelTargets } from './seed-model-targets';
```

In `initDb()`, after `runMigration002(db)`, add:
```ts
seedModelTargets(db);
```

- [ ] **Step 3: Write test `web-console/src/lib/db/__tests__/seed-model-targets.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';
import { seedModelTargets } from '../seed-model-targets';
import { PRICING_TABLE } from '@/lib/ai/pricing';

describe('seedModelTargets', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
  });

  afterEach(() => db.close());

  it('inserts all pricing entries', () => {
    const count = seedModelTargets(db);
    expect(count).toBe(PRICING_TABLE.length);

    const rows = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };
    expect(rows.n).toBe(PRICING_TABLE.length);
  });

  it('is idempotent on re-seed', () => {
    seedModelTargets(db);
    const first = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };

    seedModelTargets(db);
    const second = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };

    expect(first.n).toBe(second.n);
  });

  it('preserves manually edited prices', () => {
    seedModelTargets(db);
    // Manually edit DeepSeek price
    db.prepare(
      `UPDATE model_targets SET input_price_per_1m = 99.99, price_manually_edited = 1 WHERE id = 'deepseek-chat:api'`,
    ).run();

    // Re-seed
    seedModelTargets(db);

    const row = db
      .prepare(`SELECT input_price_per_1m FROM model_targets WHERE id = 'deepseek-chat:api'`)
      .get() as { input_price_per_1m: number };
    expect(row.input_price_per_1m).toBe(99.99);
  });

  it('seeds both CLI and API modes', () => {
    seedModelTargets(db);
    const apis = db
      .prepare(`SELECT COUNT(*) as n FROM model_targets WHERE mode = 'api'`)
      .get() as { n: number };
    const clis = db
      .prepare(`SELECT COUNT(*) as n FROM model_targets WHERE mode = 'cli'`)
      .get() as { n: number };
    expect(apis.n).toBeGreaterThan(0);
    expect(clis.n).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd web-console && pnpm test seed-model-targets
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add web-console/src/lib/db/seed-model-targets.ts web-console/src/lib/db/__tests__/seed-model-targets.test.ts web-console/src/lib/db/index.ts
git commit -m "feat(db): seed model_targets from pricing constants"
```

---

### Task 5: Seed ai_operations

**Files:**
- Create: `web-console/src/lib/db/seed-operations.ts`
- Create: `web-console/src/lib/db/__tests__/seed-operations.test.ts`
- Modify: `web-console/src/lib/db/index.ts`

- [ ] **Step 1: Create `web-console/src/lib/db/seed-operations.ts`**

```ts
import type Database from 'better-sqlite3';

export interface OperationSeed {
  id: string;
  category: string;
  displayName: string;
  description: string;
  recommendedTier: 'flagship' | 'mid' | 'efficient' | 'reasoning';
  recommendedRationale: string;
  sortOrder: number;
}

export const OPERATIONS: OperationSeed[] = [
  // ── project ──
  {
    id: 'project.brainstorm',
    category: 'project',
    displayName: '新项目头脑风暴',
    description: '多轮对话收集小说需求，产出世界观/角色/大纲草稿。',
    recommendedTier: 'flagship',
    recommendedRationale: '指挥性任务，需要深度推理与创意探索。',
    sortOrder: 10,
  },

  // ── lore ──
  {
    id: 'lore.world.generate',
    category: 'lore',
    displayName: '世界观生成',
    description: '基于题材和关键词生成或扩充世界设定（力量体系、地理、规则）。',
    recommendedTier: 'mid',
    recommendedRationale: '资料生成，影响后续全链条，需要质量门级别。',
    sortOrder: 20,
  },
  {
    id: 'lore.character.generate',
    category: 'lore',
    displayName: '角色生成',
    description: '生成或扩充单个角色卡（性格、背景、弧线）。',
    recommendedTier: 'mid',
    recommendedRationale: '同世界观生成。',
    sortOrder: 21,
  },
  {
    id: 'lore.style.generate',
    category: 'lore',
    displayName: '写作风格定义',
    description: '确定叙事视角、语言基调、参考作品。',
    recommendedTier: 'mid',
    recommendedRationale: '语言风格对中文理解敏感，需要质量门级别。',
    sortOrder: 22,
  },

  // ── outline ──
  {
    id: 'outline.volume.plan',
    category: 'outline',
    displayName: '卷大纲规划',
    description: '规划一整卷的主线、分支、节奏拐点。',
    recommendedTier: 'flagship',
    recommendedRationale: '整卷结构规划，顶层骨架决策。',
    sortOrder: 30,
  },
  {
    id: 'outline.chapter.plan',
    category: 'outline',
    displayName: '章大纲细化',
    description: '把卷大纲拆解为具体章节的场景清单。',
    recommendedTier: 'mid',
    recommendedRationale: '细化执行，需要风格感知。',
    sortOrder: 31,
  },

  // ── showrunner ──
  {
    id: 'showrunner.decide',
    category: 'showrunner',
    displayName: '制片人决策',
    description: '判断下一步动作：继续写、更新资料、触发检查点。',
    recommendedTier: 'flagship',
    recommendedRationale: '管线级全局决策。',
    sortOrder: 40,
  },
  {
    id: 'showrunner.brief',
    category: 'showrunner',
    displayName: '章节任务简报',
    description: '为编剧室生成本章写作任务。',
    recommendedTier: 'efficient',
    recommendedRationale: '根据决策写任务单，纯执行。',
    sortOrder: 41,
  },

  // ── writer ──
  {
    id: 'writer.architect',
    category: 'writer',
    displayName: '章节架构师',
    description: '先行分析章节结构、场景切分、冲突节奏，产出章节蓝图。',
    recommendedTier: 'flagship',
    recommendedRationale: '章节级指挥，决定场景/冲突/节奏。',
    sortOrder: 50,
  },
  {
    id: 'writer.main',
    category: 'writer',
    displayName: '主写手',
    description: '根据架构蓝图产出章节正文。💡 这是读者直接阅读的文字，质量敏感者推荐 Sonnet 或 Opus。',
    recommendedTier: 'mid',
    recommendedRationale: '执行性但质量敏感——默认 Sonnet 4.6，用户可调。',
    sortOrder: 51,
  },
  {
    id: 'writer.character_advocate',
    category: 'writer',
    displayName: '角色代言人',
    description: '逐角色检查言行是否符合设定，纠正 OOC。',
    recommendedTier: 'efficient',
    recommendedRationale: '按设定核对，纯检查。',
    sortOrder: 52,
  },
  {
    id: 'writer.atmosphere',
    category: 'writer',
    displayName: '氛围师',
    description: '强化场景描写、情绪基调、五感细节。',
    recommendedTier: 'efficient',
    recommendedRationale: '根据场景加五感描写，执行性。',
    sortOrder: 53,
  },
  {
    id: 'writer.foreshadow_weaver',
    category: 'writer',
    displayName: '伏笔编织者',
    description: '植入暗线、回收前伏笔、为后续铺钩子。',
    recommendedTier: 'efficient',
    recommendedRationale: '按清单植入暗线。',
    sortOrder: 54,
  },
  {
    id: 'writer.revise',
    category: 'writer',
    displayName: '第一轮修订',
    description: '统稿后修复连贯性和表达问题。',
    recommendedTier: 'efficient',
    recommendedRationale: '按反馈修改。',
    sortOrder: 55,
  },
  {
    id: 'writer.final_revise',
    category: 'writer',
    displayName: '终审润色',
    description: '最后一遍语法/流畅度打磨。',
    recommendedTier: 'mid',
    recommendedRationale: '出街前最后一道质检，不能妥协。',
    sortOrder: 56,
  },

  // ── review ──
  {
    id: 'critic.review',
    category: 'review',
    displayName: '文学评审',
    description: '从读者/编辑视角评价情节、节奏、吸引力。',
    recommendedTier: 'mid',
    recommendedRationale: '需要文学鉴赏，审美判断。',
    sortOrder: 60,
  },
  {
    id: 'continuity.check',
    category: 'review',
    displayName: '连贯性校对',
    description: '核对事实、时间线、世界规则一致性。',
    recommendedTier: 'efficient',
    recommendedRationale: '纯事实核对。',
    sortOrder: 61,
  },

  // ── context ──
  {
    id: 'context.l0.refresh',
    category: 'context',
    displayName: 'L0 全局摘要刷新',
    description: '整合所有资料生成顶层摘要（小说级）。',
    recommendedTier: 'efficient',
    recommendedRationale: '总结整合。',
    sortOrder: 70,
  },
  {
    id: 'context.l1.refresh',
    category: 'context',
    displayName: 'L1 卷级摘要刷新',
    description: '整合最近章节生成卷级上下文。',
    recommendedTier: 'efficient',
    recommendedRationale: '总结整合。',
    sortOrder: 71,
  },
];

export function seedOperations(db: Database.Database): number {
  const insert = db.prepare(`
    INSERT INTO ai_operations (
      id, category, display_name, description,
      recommended_tier, recommended_rationale, is_enabled, sort_order
    ) VALUES (
      @id, @category, @displayName, @description,
      @recommendedTier, @recommendedRationale, 1, @sortOrder
    )
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      display_name = excluded.display_name,
      description = excluded.description,
      recommended_tier = excluded.recommended_tier,
      recommended_rationale = excluded.recommended_rationale,
      sort_order = excluded.sort_order
  `);

  let count = 0;
  const txn = db.transaction(() => {
    for (const op of OPERATIONS) {
      insert.run(op);
      count++;
    }
  });
  txn();

  return count;
}
```

- [ ] **Step 2: Wire into `initDb()` in `web-console/src/lib/db/index.ts`**

Add import and call after `seedModelTargets(db)`:

```ts
import { seedOperations } from './seed-operations';
// ... inside initDb():
seedOperations(db);
```

- [ ] **Step 3: Write test `web-console/src/lib/db/__tests__/seed-operations.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';
import { seedOperations, OPERATIONS } from '../seed-operations';

describe('seedOperations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
  });

  afterEach(() => db.close());

  it('inserts all 19 operations', () => {
    expect(OPERATIONS.length).toBe(19);
    const count = seedOperations(db);
    expect(count).toBe(19);
  });

  it('covers all 7 categories', () => {
    seedOperations(db);
    const cats = db
      .prepare('SELECT DISTINCT category FROM ai_operations ORDER BY category')
      .all() as { category: string }[];
    expect(cats.map((c) => c.category)).toEqual([
      'context',
      'lore',
      'outline',
      'project',
      'review',
      'showrunner',
      'writer',
    ]);
  });

  it('all operations enabled by default', () => {
    seedOperations(db);
    const row = db
      .prepare('SELECT COUNT(*) as n FROM ai_operations WHERE is_enabled = 0')
      .get() as { n: number };
    expect(row.n).toBe(0);
  });

  it('is idempotent', () => {
    seedOperations(db);
    seedOperations(db);
    const row = db.prepare('SELECT COUNT(*) as n FROM ai_operations').get() as { n: number };
    expect(row.n).toBe(19);
  });

  it('has 7 writer operations', () => {
    seedOperations(db);
    const row = db
      .prepare(`SELECT COUNT(*) as n FROM ai_operations WHERE category = 'writer'`)
      .get() as { n: number };
    expect(row.n).toBe(7);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd web-console && pnpm test seed-operations
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add web-console/src/lib/db/seed-operations.ts web-console/src/lib/db/__tests__/seed-operations.test.ts web-console/src/lib/db/index.ts
git commit -m "feat(db): seed 19 ai_operations with tier recommendations"
```

---

### Task 6: Query functions for operations/targets/bindings

**Files:**
- Modify: `web-console/src/lib/db/queries.ts`
- Create: `web-console/src/lib/db/__tests__/queries-operations.test.ts`

- [ ] **Step 1: Add query functions to `web-console/src/lib/db/queries.ts`**

Append these functions:

```ts
// ── Types (mirror DB schema) ──────────────────────────────

export interface ModelTargetRow {
  id: string;
  model_id: string;
  provider: string;
  mode: 'api' | 'cli';
  display_name: string;
  description: string | null;
  input_price_per_1m: number | null;
  output_price_per_1m: number | null;
  cache_read_price_per_1m: number | null;
  cache_write_5m_price_per_1m: number | null;
  cache_write_1h_price_per_1m: number | null;
  context_window: number | null;
  max_output_tokens: number | null;
  available: number;
  availability_reason: string | null;
  last_checked_at: string | null;
  tier: 'flagship' | 'mid' | 'efficient' | 'reasoning' | null;
  price_manually_edited: number;
  created_at: string;
  updated_at: string;
}

export interface AiOperationRow {
  id: string;
  category: string;
  display_name: string;
  description: string;
  recommended_tier: string | null;
  recommended_rationale: string | null;
  is_enabled: number;
  sort_order: number;
  created_at: string;
}

// ── Model targets ──────────────────────────────

export function listModelTargets(): ModelTargetRow[] {
  return getDb()
    .prepare('SELECT * FROM model_targets ORDER BY provider, mode, tier')
    .all() as ModelTargetRow[];
}

export function getModelTarget(id: string): ModelTargetRow | undefined {
  return getDb()
    .prepare('SELECT * FROM model_targets WHERE id = ?')
    .get(id) as ModelTargetRow | undefined;
}

export function updateTargetAvailability(
  id: string,
  available: boolean,
  reason: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE model_targets
       SET available = ?, availability_reason = ?, last_checked_at = datetime('now')
       WHERE id = ?`,
    )
    .run(available ? 1 : 0, reason, id);
}

export function updateTargetPricing(
  id: string,
  pricing: {
    input_price_per_1m: number | null;
    output_price_per_1m: number | null;
    cache_read_price_per_1m: number | null;
  },
  manuallyEdited = true,
): void {
  getDb()
    .prepare(
      `UPDATE model_targets
       SET input_price_per_1m = ?, output_price_per_1m = ?, cache_read_price_per_1m = ?,
           price_manually_edited = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      pricing.input_price_per_1m,
      pricing.output_price_per_1m,
      pricing.cache_read_price_per_1m,
      manuallyEdited ? 1 : 0,
      id,
    );
}

// ── AI operations ──────────────────────────────

export function listOperations(): AiOperationRow[] {
  return getDb()
    .prepare('SELECT * FROM ai_operations ORDER BY sort_order')
    .all() as AiOperationRow[];
}

export function getOperation(id: string): AiOperationRow | undefined {
  return getDb()
    .prepare('SELECT * FROM ai_operations WHERE id = ?')
    .get(id) as AiOperationRow | undefined;
}

export function setOperationEnabled(id: string, enabled: boolean): void {
  getDb()
    .prepare('UPDATE ai_operations SET is_enabled = ? WHERE id = ?')
    .run(enabled ? 1 : 0, id);
}

// ── Bindings ──────────────────────────────

export function getCategoryDefault(category: string): string | undefined {
  const row = getDb()
    .prepare('SELECT target_id FROM operation_category_defaults WHERE category = ?')
    .get(category) as { target_id: string } | undefined;
  return row?.target_id;
}

export function setCategoryDefault(category: string, targetId: string): void {
  getDb()
    .prepare(
      `INSERT INTO operation_category_defaults (category, target_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(category) DO UPDATE SET target_id = excluded.target_id, updated_at = excluded.updated_at`,
    )
    .run(category, targetId);
}

export function clearCategoryDefault(category: string): void {
  getDb().prepare('DELETE FROM operation_category_defaults WHERE category = ?').run(category);
}

export function getOperationOverride(operationId: string): string | undefined {
  const row = getDb()
    .prepare('SELECT target_id FROM operation_overrides WHERE operation_id = ?')
    .get(operationId) as { target_id: string } | undefined;
  return row?.target_id;
}

export function setOperationOverride(operationId: string, targetId: string): void {
  getDb()
    .prepare(
      `INSERT INTO operation_overrides (operation_id, target_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(operation_id) DO UPDATE SET target_id = excluded.target_id, updated_at = excluded.updated_at`,
    )
    .run(operationId, targetId);
}

export function clearOperationOverride(operationId: string): void {
  getDb().prepare('DELETE FROM operation_overrides WHERE operation_id = ?').run(operationId);
}
```

- [ ] **Step 2: Write test `web-console/src/lib/db/__tests__/queries-operations.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';
import { seedModelTargets } from '../seed-model-targets';
import { seedOperations } from '../seed-operations';

// Since queries use getDb(), we need to mock it for isolated tests.
// We'll use module-level replacement via vi.mock.
import * as dbModule from '../index';
import { vi } from 'vitest';

describe('operations queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('lists all 19 operations', async () => {
    const { listOperations } = await import('../queries');
    const ops = listOperations();
    expect(ops.length).toBe(19);
  });

  it('getOperation returns writer.main', async () => {
    const { getOperation } = await import('../queries');
    const op = getOperation('writer.main');
    expect(op?.category).toBe('writer');
    expect(op?.display_name).toBe('主写手');
  });

  it('set and get category default', async () => {
    const { setCategoryDefault, getCategoryDefault } = await import('../queries');
    setCategoryDefault('writer', 'deepseek-chat:api');
    expect(getCategoryDefault('writer')).toBe('deepseek-chat:api');
  });

  it('set and get operation override', async () => {
    const { setOperationOverride, getOperationOverride } = await import('../queries');
    setOperationOverride('writer.main', 'claude-sonnet-4-6:api');
    expect(getOperationOverride('writer.main')).toBe('claude-sonnet-4-6:api');
  });

  it('clear override removes row', async () => {
    const { setOperationOverride, clearOperationOverride, getOperationOverride } =
      await import('../queries');
    setOperationOverride('writer.main', 'claude-sonnet-4-6:api');
    clearOperationOverride('writer.main');
    expect(getOperationOverride('writer.main')).toBeUndefined();
  });

  it('setOperationEnabled toggles is_enabled', async () => {
    const { setOperationEnabled, getOperation } = await import('../queries');
    setOperationEnabled('writer.foreshadow_weaver', false);
    expect(getOperation('writer.foreshadow_weaver')?.is_enabled).toBe(0);
    setOperationEnabled('writer.foreshadow_weaver', true);
    expect(getOperation('writer.foreshadow_weaver')?.is_enabled).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test queries-operations
```
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/db/queries.ts web-console/src/lib/db/__tests__/queries-operations.test.ts
git commit -m "feat(db): queries for operations/targets/bindings CRUD"
```

---

### Task 7: Budget + snapshot + usage queries

**Files:**
- Modify: `web-console/src/lib/db/queries.ts`
- Create: `web-console/src/lib/db/__tests__/queries-budget.test.ts`

- [ ] **Step 1: Append budget & snapshot & usage queries to `web-console/src/lib/db/queries.ts`**

```ts
// ── Budget config ──────────────────────────────

export interface BudgetConfigRow {
  id: number;
  daily_budget_usd: number;
  warn_threshold_pct: number;
  soft_block_threshold_pct: number;
  hard_block_threshold_pct: number;
  fallback_target_id: string | null;
  updated_at: string;
}

export function getBudgetConfig(): BudgetConfigRow {
  const row = getDb()
    .prepare('SELECT * FROM budget_config WHERE id = 1')
    .get() as BudgetConfigRow | undefined;
  if (!row) {
    // Initialize default row
    getDb()
      .prepare(
        `INSERT INTO budget_config (id, daily_budget_usd, warn_threshold_pct,
           soft_block_threshold_pct, hard_block_threshold_pct)
         VALUES (1, 0, 80, 100, 120)`,
      )
      .run();
    return getDb()
      .prepare('SELECT * FROM budget_config WHERE id = 1')
      .get() as BudgetConfigRow;
  }
  return row;
}

export function updateBudgetConfig(patch: Partial<Omit<BudgetConfigRow, 'id' | 'updated_at'>>): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  getDb()
    .prepare(`UPDATE budget_config SET ${fields.join(', ')} WHERE id = 1`)
    .run(...values);
}

/** Total cost incurred today (UTC day boundary based on server local time) */
export function getTodayCost(): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(cost_usd), 0) as total
       FROM token_usage
       WHERE date(timestamp) = date('now')`,
    )
    .get() as { total: number };
  return row.total;
}

// ── Pipeline snapshots ──────────────────────────────

export interface PipelineSnapshotRow {
  id: string;
  timestamp: string;
  operation_id: string;
  attempted_target_id: string;
  failure_category: 'transient' | 'permanent' | 'unknown';
  failure_message: string;
  payload_file_path: string;
  ai_summary: string | null;
  resume_hint: string | null;
  status: 'pending' | 'resumed' | 'abandoned';
  resumed_at: string | null;
  created_at: string;
}

export function insertSnapshot(row: Omit<PipelineSnapshotRow, 'created_at'>): void {
  getDb()
    .prepare(
      `INSERT INTO pipeline_snapshots (
         id, timestamp, operation_id, attempted_target_id,
         failure_category, failure_message, payload_file_path,
         ai_summary, resume_hint, status, resumed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.timestamp,
      row.operation_id,
      row.attempted_target_id,
      row.failure_category,
      row.failure_message,
      row.payload_file_path,
      row.ai_summary,
      row.resume_hint,
      row.status,
      row.resumed_at,
    );
}

export function listSnapshots(statusFilter?: PipelineSnapshotRow['status']): PipelineSnapshotRow[] {
  const db = getDb();
  if (statusFilter) {
    return db
      .prepare('SELECT * FROM pipeline_snapshots WHERE status = ? ORDER BY timestamp DESC')
      .all(statusFilter) as PipelineSnapshotRow[];
  }
  return db
    .prepare('SELECT * FROM pipeline_snapshots ORDER BY timestamp DESC')
    .all() as PipelineSnapshotRow[];
}

export function getSnapshot(id: string): PipelineSnapshotRow | undefined {
  return getDb()
    .prepare('SELECT * FROM pipeline_snapshots WHERE id = ?')
    .get(id) as PipelineSnapshotRow | undefined;
}

export function updateSnapshotStatus(
  id: string,
  status: PipelineSnapshotRow['status'],
  resumedAt?: string,
): void {
  getDb()
    .prepare(
      'UPDATE pipeline_snapshots SET status = ?, resumed_at = ? WHERE id = ?',
    )
    .run(status, resumedAt ?? null, id);
}

// ── Enhanced token_usage insertion ──────────────────────────────

export interface TokenUsageInsert {
  process_id?: string;
  cli_type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  target_id: string;
  operation_id: string;
  cost_usd: number;
  was_cli_mode: boolean;
  chapter_number?: number;
  role?: string;
}

export function insertTokenUsageV2(row: TokenUsageInsert): void {
  getDb()
    .prepare(
      `INSERT INTO token_usage (
         process_id, cli_type, model, input_tokens, output_tokens,
         cache_read_tokens, cache_write_tokens, target_id, operation_id,
         cost_usd, was_cli_mode, chapter_number, role
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.process_id ?? null,
      row.cli_type,
      row.model,
      row.input_tokens,
      row.output_tokens,
      row.cache_read_tokens ?? 0,
      row.cache_write_tokens ?? 0,
      row.target_id,
      row.operation_id,
      row.cost_usd,
      row.was_cli_mode ? 1 : 0,
      row.chapter_number ?? null,
      row.role ?? null,
    );
}
```

- [ ] **Step 2: Write test `web-console/src/lib/db/__tests__/queries-budget.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';
import { seedModelTargets } from '../seed-model-targets';
import { seedOperations } from '../seed-operations';
import * as dbModule from '../index';

describe('budget queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('getBudgetConfig returns defaults on empty table', async () => {
    const { getBudgetConfig } = await import('../queries');
    const cfg = getBudgetConfig();
    expect(cfg.daily_budget_usd).toBe(0);
    expect(cfg.warn_threshold_pct).toBe(80);
    expect(cfg.soft_block_threshold_pct).toBe(100);
    expect(cfg.hard_block_threshold_pct).toBe(120);
  });

  it('updateBudgetConfig persists changes', async () => {
    const { getBudgetConfig, updateBudgetConfig } = await import('../queries');
    getBudgetConfig(); // init
    updateBudgetConfig({ daily_budget_usd: 5.0, warn_threshold_pct: 75 });
    const cfg = getBudgetConfig();
    expect(cfg.daily_budget_usd).toBe(5.0);
    expect(cfg.warn_threshold_pct).toBe(75);
  });

  it('getTodayCost is 0 for empty token_usage', async () => {
    const { getTodayCost } = await import('../queries');
    expect(getTodayCost()).toBe(0);
  });

  it('getTodayCost sums today rows only', async () => {
    const { getTodayCost, insertTokenUsageV2 } = await import('../queries');
    insertTokenUsageV2({
      cli_type: 'api',
      model: 'claude-sonnet-4-6',
      input_tokens: 1000,
      output_tokens: 500,
      target_id: 'claude-sonnet-4-6:api',
      operation_id: 'writer.main',
      cost_usd: 0.25,
      was_cli_mode: false,
    });
    insertTokenUsageV2({
      cli_type: 'api',
      model: 'deepseek-chat',
      input_tokens: 2000,
      output_tokens: 1000,
      target_id: 'deepseek-chat:api',
      operation_id: 'writer.atmosphere',
      cost_usd: 0.03,
      was_cli_mode: false,
    });
    expect(getTodayCost()).toBeCloseTo(0.28, 5);
  });
});

describe('snapshot queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('insert and retrieve snapshot', async () => {
    const { insertSnapshot, getSnapshot } = await import('../queries');
    insertSnapshot({
      id: 'snap-123',
      timestamp: '2026-04-10T10:00:00Z',
      operation_id: 'writer.main',
      attempted_target_id: 'claude-opus-4-6:api',
      failure_category: 'transient',
      failure_message: 'Rate limit exceeded',
      payload_file_path: 'workspace/snapshots/snap-123.json',
      ai_summary: null,
      resume_hint: null,
      status: 'pending',
      resumed_at: null,
    });

    const row = getSnapshot('snap-123');
    expect(row?.operation_id).toBe('writer.main');
    expect(row?.status).toBe('pending');
  });

  it('listSnapshots filters by status', async () => {
    const { insertSnapshot, listSnapshots, updateSnapshotStatus } = await import('../queries');

    for (const id of ['s1', 's2', 's3']) {
      insertSnapshot({
        id,
        timestamp: '2026-04-10T10:00:00Z',
        operation_id: 'writer.main',
        attempted_target_id: 'claude-opus-4-6:api',
        failure_category: 'transient',
        failure_message: 'test',
        payload_file_path: `workspace/snapshots/${id}.json`,
        ai_summary: null,
        resume_hint: null,
        status: 'pending',
        resumed_at: null,
      });
    }

    updateSnapshotStatus('s2', 'resumed', '2026-04-10T11:00:00Z');

    const pending = listSnapshots('pending');
    expect(pending.length).toBe(2);
    expect(pending.map((s) => s.id).sort()).toEqual(['s1', 's3']);

    const resumed = listSnapshots('resumed');
    expect(resumed.length).toBe(1);
    expect(resumed[0].id).toBe('s2');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test queries-budget
```
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/db/queries.ts web-console/src/lib/db/__tests__/queries-budget.test.ts
git commit -m "feat(db): queries for budget/snapshots/enhanced token_usage"
```

---

### Task 8: Error types for AI layer

**Files:**
- Create: `web-console/src/lib/ai-providers/errors.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/errors.ts`**

```ts
/**
 * Custom error types for the AI provider layer.
 * All errors are structured so callers can branch on instanceof.
 */

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class OperationNotConfiguredError extends AIError {
  constructor(public operationId: string) {
    super(`Operation ${operationId} has no model binding (no override, no category default)`);
    this.name = 'OperationNotConfiguredError';
  }
}

export class OperationDisabledError extends AIError {
  constructor(public operationId: string) {
    super(`Operation ${operationId} is disabled in configuration`);
    this.name = 'OperationDisabledError';
  }
}

export class TargetNotAvailableError extends AIError {
  constructor(public targetId: string, public reason: string) {
    super(`Model target ${targetId} is not available: ${reason}`);
    this.name = 'TargetNotAvailableError';
  }
}

export class AdapterNotFoundError extends AIError {
  constructor(public provider: string, public mode: string) {
    super(`No adapter registered for provider=${provider} mode=${mode}`);
    this.name = 'AdapterNotFoundError';
  }
}

export class BudgetWarnError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget warning: ${pct.toFixed(1)}% of $${budget}`);
    this.name = 'BudgetWarnError';
  }
}

export class BudgetSoftBlockedError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget soft-blocked at ${pct.toFixed(1)}% of $${budget} — confirm to continue`);
    this.name = 'BudgetSoftBlockedError';
  }
}

export class BudgetHardBlockedError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget hard-blocked at ${pct.toFixed(1)}% of $${budget}`);
    this.name = 'BudgetHardBlockedError';
  }
}

export class OperationFailedError extends AIError {
  constructor(
    public operationId: string,
    public originalError: Error,
    public snapshotId: string,
  ) {
    super(
      `Operation ${operationId} failed: ${originalError.message} (snapshot: ${snapshotId})`,
    );
    this.name = 'OperationFailedError';
  }
}

export class ProviderAPIError extends AIError {
  constructor(
    public provider: string,
    public status: number | null,
    public originalMessage: string,
  ) {
    super(`Provider ${provider} API error (status=${status}): ${originalMessage}`);
    this.name = 'ProviderAPIError';
  }
}

/** Classify a thrown error as transient / permanent / unknown */
export function classifyError(err: unknown): 'transient' | 'permanent' | 'unknown' {
  if (err instanceof ProviderAPIError) {
    if (err.status === null) return 'transient'; // network error
    if (err.status === 429) return 'transient';
    if (err.status >= 500 && err.status < 600) return 'transient';
    if (err.status === 401 || err.status === 403) return 'permanent';
    if (err.status === 404) return 'permanent';
    if (err.status >= 400 && err.status < 500) return 'permanent';
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused')) {
      return 'transient';
    }
    if (msg.includes('unauthorized') || msg.includes('forbidden')) {
      return 'permanent';
    }
  }

  return 'unknown';
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/__tests__/errors.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  OperationNotConfiguredError,
  ProviderAPIError,
  classifyError,
} from '../errors';

describe('error classes', () => {
  it('OperationNotConfiguredError carries operationId', () => {
    const err = new OperationNotConfiguredError('writer.main');
    expect(err.operationId).toBe('writer.main');
    expect(err.message).toContain('writer.main');
  });

  it('ProviderAPIError carries status', () => {
    const err = new ProviderAPIError('anthropic', 429, 'rate limit');
    expect(err.provider).toBe('anthropic');
    expect(err.status).toBe(429);
  });
});

describe('classifyError', () => {
  it('429 is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 429, 'rate'))).toBe('transient');
  });

  it('500 is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 500, 'err'))).toBe('transient');
  });

  it('401 is permanent', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 401, 'unauth'))).toBe('permanent');
  });

  it('404 is permanent', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 404, 'nope'))).toBe('permanent');
  });

  it('network error (null status) is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', null, 'econnreset'))).toBe('transient');
  });

  it('timeout message is transient', () => {
    expect(classifyError(new Error('request timeout'))).toBe('transient');
  });

  it('unknown is unknown', () => {
    expect(classifyError(new Error('something weird'))).toBe('unknown');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test errors
```
Expected: 9 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/errors.ts web-console/src/lib/ai-providers/__tests__/errors.test.ts
git commit -m "feat(ai): error types and classifyError helper"
```

---

## Phase 1.B: Core Logic (Tasks 9-13)

### Task 9: Shared types for AI providers

**Files:**
- Create: `web-console/src/lib/ai-providers/types.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/types.ts`**

```ts
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
  /** Which providers from the pricing table this adapter handles */
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
```

- [ ] **Step 2: Commit**

```bash
git add web-console/src/lib/ai-providers/types.ts
git commit -m "feat(ai): shared types for provider adapters and execution"
```

---

### Task 10: resolveOperationTarget

**Files:**
- Create: `web-console/src/lib/ai/resolve-target.ts`
- Create: `web-console/src/lib/ai/__tests__/resolve-target.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/resolve-target.ts`**

```ts
import {
  getOperation,
  getOperationOverride,
  getCategoryDefault,
  getModelTarget,
  type ModelTargetRow,
} from '@/lib/db/queries';
import {
  OperationNotConfiguredError,
  OperationDisabledError,
} from '@/lib/ai-providers/errors';

/**
 * Resolve an operation to its effective model target.
 * Priority:
 *   1. Operation-level override
 *   2. Category-level default
 *   3. Throw OperationNotConfiguredError
 *
 * Also throws OperationDisabledError if the operation is disabled.
 */
export function resolveOperationTarget(operationId: string): ModelTargetRow {
  const op = getOperation(operationId);
  if (!op) {
    throw new OperationNotConfiguredError(operationId);
  }
  if (!op.is_enabled) {
    throw new OperationDisabledError(operationId);
  }

  // 1. Override
  const overrideTargetId = getOperationOverride(operationId);
  if (overrideTargetId) {
    const target = getModelTarget(overrideTargetId);
    if (target) return target;
  }

  // 2. Category default
  const catTargetId = getCategoryDefault(op.category);
  if (catTargetId) {
    const target = getModelTarget(catTargetId);
    if (target) return target;
  }

  // 3. Nothing configured
  throw new OperationNotConfiguredError(operationId);
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/resolve-target.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('resolveOperationTarget', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('throws when nothing is configured', async () => {
    const { resolveOperationTarget } = await import('../resolve-target');
    expect(() => resolveOperationTarget('writer.main')).toThrow(
      /OperationNotConfiguredError|has no model binding/,
    );
  });

  it('uses category default when set', async () => {
    const { resolveOperationTarget } = await import('../resolve-target');
    const { setCategoryDefault } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'deepseek-chat:api');

    const target = resolveOperationTarget('writer.main');
    expect(target.id).toBe('deepseek-chat:api');
  });

  it('override beats category default', async () => {
    const { resolveOperationTarget } = await import('../resolve-target');
    const { setCategoryDefault, setOperationOverride } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'deepseek-chat:api');
    setOperationOverride('writer.main', 'claude-sonnet-4-6:api');

    const target = resolveOperationTarget('writer.main');
    expect(target.id).toBe('claude-sonnet-4-6:api');
  });

  it('throws OperationDisabledError for disabled ops', async () => {
    const { resolveOperationTarget } = await import('../resolve-target');
    const { setCategoryDefault, setOperationEnabled } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'deepseek-chat:api');
    setOperationEnabled('writer.main', false);

    expect(() => resolveOperationTarget('writer.main')).toThrow(
      /OperationDisabledError|disabled/,
    );
  });

  it('throws OperationNotConfiguredError for unknown operation id', async () => {
    const { resolveOperationTarget } = await import('../resolve-target');
    expect(() => resolveOperationTarget('nonexistent.op')).toThrow(
      /OperationNotConfiguredError/,
    );
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test resolve-target
```
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/resolve-target.ts web-console/src/lib/ai/__tests__/resolve-target.test.ts
git commit -m "feat(ai): resolveOperationTarget with override/category inheritance"
```

---

### Task 11: Budget enforcement

**Files:**
- Create: `web-console/src/lib/ai/budget.ts`
- Create: `web-console/src/lib/ai/__tests__/budget.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/budget.ts`**

```ts
import { getBudgetConfig, getTodayCost } from '@/lib/db/queries';
import {
  BudgetSoftBlockedError,
  BudgetHardBlockedError,
} from '@/lib/ai-providers/errors';
import type { BudgetState } from '@/lib/ai-providers/types';

/**
 * Enforce budget thresholds. Throws on hard_block or soft_block (unless confirmed).
 * Returns current state for caller to handle warn-level notifications.
 */
export function enforceBudget(
  operationId: string,
  opts: { allowSoftBlockConfirmed?: boolean } = {},
): BudgetState {
  const budget = getBudgetConfig();
  if (budget.daily_budget_usd === 0) {
    return { level: 'ok' };
  }

  const todayCost = getTodayCost();
  const pct = (todayCost / budget.daily_budget_usd) * 100;

  if (pct >= budget.hard_block_threshold_pct) {
    throw new BudgetHardBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.soft_block_threshold_pct) {
    if (opts.allowSoftBlockConfirmed) {
      return { level: 'soft_block', pct, budget: budget.daily_budget_usd, todayCost };
    }
    throw new BudgetSoftBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.warn_threshold_pct) {
    return { level: 'warn', pct, budget: budget.daily_budget_usd, todayCost };
  }
  return { level: 'ok' };
}

/**
 * Non-throwing check for UI use. Always returns a state.
 */
export function checkBudget(operationId: string): BudgetState {
  try {
    return enforceBudget(operationId, { allowSoftBlockConfirmed: true });
  } catch (err) {
    if (err instanceof BudgetHardBlockedError) {
      return {
        level: 'hard_block',
        pct: err.pct,
        budget: err.budget,
        todayCost: (err.pct / 100) * err.budget,
      };
    }
    throw err;
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/budget.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('enforceBudget', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  async function addUsage(cost: number) {
    const { insertTokenUsageV2 } = await import('@/lib/db/queries');
    insertTokenUsageV2({
      cli_type: 'api',
      model: 'claude-sonnet-4-6',
      input_tokens: 0,
      output_tokens: 0,
      target_id: 'claude-sonnet-4-6:api',
      operation_id: 'writer.main',
      cost_usd: cost,
      was_cli_mode: false,
    });
  }

  async function setBudget(budget: number) {
    const { updateBudgetConfig, getBudgetConfig } = await import('@/lib/db/queries');
    getBudgetConfig(); // init
    updateBudgetConfig({ daily_budget_usd: budget });
  }

  it('budget=0 returns ok', async () => {
    const { enforceBudget } = await import('../budget');
    const state = enforceBudget('writer.main');
    expect(state.level).toBe('ok');
  });

  it('under 80% returns ok', async () => {
    await setBudget(10);
    await addUsage(5); // 50%
    const { enforceBudget } = await import('../budget');
    expect(enforceBudget('writer.main').level).toBe('ok');
  });

  it('at 80% returns warn', async () => {
    await setBudget(10);
    await addUsage(8); // 80%
    const { enforceBudget } = await import('../budget');
    const state = enforceBudget('writer.main');
    expect(state.level).toBe('warn');
  });

  it('at 100% throws soft block', async () => {
    await setBudget(10);
    await addUsage(10);
    const { enforceBudget } = await import('../budget');
    expect(() => enforceBudget('writer.main')).toThrow(/soft-blocked/);
  });

  it('at 100% with confirmed returns soft_block state', async () => {
    await setBudget(10);
    await addUsage(10);
    const { enforceBudget } = await import('../budget');
    const state = enforceBudget('writer.main', { allowSoftBlockConfirmed: true });
    expect(state.level).toBe('soft_block');
  });

  it('at 120% throws hard block', async () => {
    await setBudget(10);
    await addUsage(12);
    const { enforceBudget } = await import('../budget');
    expect(() => enforceBudget('writer.main')).toThrow(/hard-blocked/);
  });

  it('checkBudget returns hard_block instead of throwing', async () => {
    await setBudget(10);
    await addUsage(12);
    const { checkBudget } = await import('../budget');
    const state = checkBudget('writer.main');
    expect(state.level).toBe('hard_block');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test budget
```
Expected: 7 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/budget.ts web-console/src/lib/ai/__tests__/budget.test.ts
git commit -m "feat(ai): enforceBudget with 80/100/120 tiered thresholds"
```

---

### Task 12: Adapter factory

**Files:**
- Create: `web-console/src/lib/ai-providers/factory.ts`
- Create: `web-console/src/lib/ai-providers/__tests__/factory.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/factory.ts`**

```ts
import type { ProviderAdapter } from './types';
import { getModelTarget } from '@/lib/db/queries';
import { AdapterNotFoundError, TargetNotAvailableError } from './errors';

const adapters = new Map<string, ProviderAdapter>();

/** Register an adapter under the key `${provider}-${mode}` */
export function registerAdapter(adapter: ProviderAdapter): void {
  for (const provider of adapter.supportedProviders) {
    const key = `${provider}-${adapter.mode}`;
    adapters.set(key, adapter);
  }
}

/** Look up adapter by provider + mode */
export function getAdapter(provider: string, mode: 'api' | 'cli'): ProviderAdapter {
  const key = `${provider}-${mode}`;
  const adapter = adapters.get(key);
  if (!adapter) {
    throw new AdapterNotFoundError(provider, mode);
  }
  return adapter;
}

/** Resolve an adapter for a target ID (looks up target row first) */
export function getAdapterForTarget(targetId: string): ProviderAdapter {
  const target = getModelTarget(targetId);
  if (!target) {
    throw new TargetNotAvailableError(targetId, 'target row not found in database');
  }
  return getAdapter(target.provider, target.mode);
}

/** For testing: clear the registry */
export function __clearAdapters(): void {
  adapters.clear();
}

/** For testing: introspect registry */
export function __listRegisteredKeys(): string[] {
  return Array.from(adapters.keys());
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/__tests__/factory.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import type { ProviderAdapter, ExecuteParams, ExecuteResult } from '../types';
import {
  registerAdapter,
  getAdapter,
  getAdapterForTarget,
  __clearAdapters,
} from '../factory';

function makeMockAdapter(providers: string[], mode: 'api' | 'cli'): ProviderAdapter {
  return {
    id: `mock-${providers.join(',')}-${mode}`,
    mode,
    supportedProviders: providers,
    async detectAvailability() {
      return { available: true };
    },
    async execute(_p: ExecuteParams): Promise<ExecuteResult> {
      return {
        content: 'mock',
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: 0,
        wasCliMode: mode === 'cli',
        finishReason: 'stop',
      };
    },
    async *stream(_p: ExecuteParams) {
      yield { type: 'done' as const };
    },
  };
}

describe('adapter factory', () => {
  beforeEach(() => {
    __clearAdapters();
  });

  it('registerAdapter + getAdapter roundtrip', () => {
    const adapter = makeMockAdapter(['anthropic'], 'api');
    registerAdapter(adapter);
    expect(getAdapter('anthropic', 'api').id).toBe(adapter.id);
  });

  it('single adapter can serve multiple providers', () => {
    const adapter = makeMockAdapter(['openai', 'deepseek', 'alibaba'], 'api');
    registerAdapter(adapter);
    expect(getAdapter('openai', 'api').id).toBe(adapter.id);
    expect(getAdapter('deepseek', 'api').id).toBe(adapter.id);
    expect(getAdapter('alibaba', 'api').id).toBe(adapter.id);
  });

  it('throws AdapterNotFoundError for unknown provider', () => {
    expect(() => getAdapter('unknown', 'api')).toThrow(/No adapter registered/);
  });

  it('api and cli are separate namespaces', () => {
    const apiAdapter = makeMockAdapter(['anthropic'], 'api');
    const cliAdapter = makeMockAdapter(['anthropic'], 'cli');
    registerAdapter(apiAdapter);
    registerAdapter(cliAdapter);

    expect(getAdapter('anthropic', 'api').id).toBe(apiAdapter.id);
    expect(getAdapter('anthropic', 'cli').id).toBe(cliAdapter.id);
  });
});

describe('getAdapterForTarget', () => {
  let db: Database.Database;

  beforeEach(() => {
    __clearAdapters();
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('resolves target ID to correct adapter', () => {
    const adapter = makeMockAdapter(['anthropic'], 'api');
    registerAdapter(adapter);
    const result = getAdapterForTarget('claude-opus-4-6:api');
    expect(result.id).toBe(adapter.id);
  });

  it('throws for unknown target', () => {
    expect(() => getAdapterForTarget('nonexistent:api')).toThrow(/not found/);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test factory
```
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/factory.ts web-console/src/lib/ai-providers/__tests__/factory.test.ts
git commit -m "feat(ai): adapter factory with multi-provider support"
```

---

### Task 13: Snapshot management (creation + resume)

**Files:**
- Create: `web-console/src/lib/ai/snapshots.ts`
- Create: `web-console/src/lib/ai/__tests__/snapshots.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/snapshots.ts`**

```ts
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import {
  insertSnapshot,
  getSnapshot,
  updateSnapshotStatus,
  type PipelineSnapshotRow,
} from '@/lib/db/queries';
import { classifyError } from '@/lib/ai-providers/errors';
import type { ExecuteParams } from '@/lib/ai-providers/types';

const SNAPSHOT_DIR = path.resolve(process.cwd(), '..', 'workspace', 'snapshots');

async function ensureSnapshotDir(): Promise<void> {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
}

export interface FailureContext {
  operationId: string;
  targetId: string;
  params: ExecuteParams;
  error: Error;
}

export interface CreatedSnapshot {
  id: string;
  payloadPath: string;
  category: 'transient' | 'permanent' | 'unknown';
}

/**
 * Create a failure snapshot. Writes payload file, inserts DB row.
 * AI analysis via fallback model is attempted only for non-permanent errors;
 * if fallback is unavailable we still succeed with ai_summary=null.
 */
export async function createFailureSnapshot(
  ctx: FailureContext,
): Promise<CreatedSnapshot> {
  await ensureSnapshotDir();

  const snapshotId = nanoid(12);
  const category = classifyError(ctx.error);
  const payloadPath = path.join(SNAPSHOT_DIR, `${snapshotId}.json`);

  const payload = {
    operationId: ctx.operationId,
    targetId: ctx.targetId,
    params: ctx.params,
    errorName: ctx.error.name,
    errorMessage: ctx.error.message,
    errorStack: ctx.error.stack ?? null,
    timestamp: new Date().toISOString(),
  };

  await writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf8');

  // AI analysis: best-effort. If anything fails, fall back to null summary.
  let aiSummary: string | null = null;
  let resumeHint: string | null = null;

  if (category !== 'permanent') {
    try {
      const analysis = await attemptFallbackAnalysis(ctx);
      aiSummary = analysis.summary;
      resumeHint = analysis.hint;
    } catch {
      // Fallback also failed — per spec detail 4-A, degrade to pure serialization
      aiSummary = null;
      resumeHint = null;
    }
  }

  insertSnapshot({
    id: snapshotId,
    timestamp: payload.timestamp,
    operation_id: ctx.operationId,
    attempted_target_id: ctx.targetId,
    failure_category: category,
    failure_message: ctx.error.message,
    payload_file_path: payloadPath,
    ai_summary: aiSummary,
    resume_hint: resumeHint,
    status: 'pending',
    resumed_at: null,
  });

  return { id: snapshotId, payloadPath, category };
}

/**
 * Attempt to invoke the fallback model from budget_config to summarize the failure.
 * Lives as a separate function so tests can stub it.
 * For now: returns null (Task 15 will wire runOperation).
 */
export async function attemptFallbackAnalysis(
  _ctx: FailureContext,
): Promise<{ summary: string; hint: string }> {
  // Task 15 will wire this to runOperation with budget.fallback_target_id.
  // Until then, we throw to trigger "null summary" path.
  throw new Error('Fallback analysis not wired yet');
}

/**
 * Read back a snapshot's payload file.
 */
export async function readSnapshotPayload(
  snapshotId: string,
): Promise<ReturnType<typeof JSON.parse>> {
  const row = getSnapshot(snapshotId);
  if (!row) throw new Error(`Snapshot ${snapshotId} not found`);
  const content = await readFile(row.payload_file_path, 'utf8');
  return JSON.parse(content);
}

/**
 * Mark snapshot as resumed.
 */
export function markResumed(snapshotId: string): void {
  updateSnapshotStatus(snapshotId, 'resumed', new Date().toISOString());
}

/**
 * Mark snapshot as abandoned.
 */
export function markAbandoned(snapshotId: string): void {
  updateSnapshotStatus(snapshotId, 'abandoned');
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/snapshots.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import { ProviderAPIError } from '@/lib/ai-providers/errors';
import type { ExecuteParams } from '@/lib/ai-providers/types';

const TEST_SNAPSHOT_DIR = path.resolve(process.cwd(), '..', 'workspace', 'snapshots');

describe('createFailureSnapshot', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    await mkdir(TEST_SNAPSHOT_DIR, { recursive: true });
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    // Cleanup test snapshot files
    try {
      await rm(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  const sampleParams: ExecuteParams = {
    targetId: 'claude-opus-4-6:api',
    operationId: 'writer.main',
    messages: [{ role: 'user', content: 'write chapter' }],
  };

  it('creates snapshot with transient classification for 429', async () => {
    const { createFailureSnapshot } = await import('../snapshots');
    const err = new ProviderAPIError('anthropic', 429, 'rate limit');

    const snapshot = await createFailureSnapshot({
      operationId: 'writer.main',
      targetId: 'claude-opus-4-6:api',
      params: sampleParams,
      error: err,
    });

    expect(snapshot.category).toBe('transient');
    expect(snapshot.id).toHaveLength(12);

    const { getSnapshot } = await import('@/lib/db/queries');
    const row = getSnapshot(snapshot.id);
    expect(row?.failure_category).toBe('transient');
    expect(row?.status).toBe('pending');
  });

  it('creates snapshot with permanent classification for 401', async () => {
    const { createFailureSnapshot } = await import('../snapshots');
    const err = new ProviderAPIError('anthropic', 401, 'unauthorized');

    const snapshot = await createFailureSnapshot({
      operationId: 'writer.main',
      targetId: 'claude-opus-4-6:api',
      params: sampleParams,
      error: err,
    });

    expect(snapshot.category).toBe('permanent');
  });

  it('handles fallback analysis failure gracefully', async () => {
    // Default attemptFallbackAnalysis throws — creation should still succeed with null summary
    const { createFailureSnapshot } = await import('../snapshots');
    const err = new ProviderAPIError('anthropic', 500, 'server error');

    const snapshot = await createFailureSnapshot({
      operationId: 'writer.main',
      targetId: 'claude-opus-4-6:api',
      params: sampleParams,
      error: err,
    });

    const { getSnapshot } = await import('@/lib/db/queries');
    const row = getSnapshot(snapshot.id);
    expect(row?.ai_summary).toBeNull();
  });

  it('writes payload file with full context', async () => {
    const { createFailureSnapshot, readSnapshotPayload } = await import('../snapshots');
    const err = new ProviderAPIError('anthropic', 429, 'rate limit');

    const snapshot = await createFailureSnapshot({
      operationId: 'writer.main',
      targetId: 'claude-opus-4-6:api',
      params: sampleParams,
      error: err,
    });

    const payload = await readSnapshotPayload(snapshot.id);
    expect(payload.operationId).toBe('writer.main');
    expect(payload.targetId).toBe('claude-opus-4-6:api');
    expect(payload.errorMessage).toBe(err.message);
  });

  it('markResumed updates status', async () => {
    const { createFailureSnapshot, markResumed } = await import('../snapshots');
    const err = new ProviderAPIError('anthropic', 429, 'rate limit');
    const snapshot = await createFailureSnapshot({
      operationId: 'writer.main',
      targetId: 'claude-opus-4-6:api',
      params: sampleParams,
      error: err,
    });

    markResumed(snapshot.id);
    const { getSnapshot } = await import('@/lib/db/queries');
    const row = getSnapshot(snapshot.id);
    expect(row?.status).toBe('resumed');
    expect(row?.resumed_at).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test snapshots
```
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/snapshots.ts web-console/src/lib/ai/__tests__/snapshots.test.ts
git commit -m "feat(ai): failure snapshot creation with payload file + DB row"
```

---

## Phase 1.C: Provider Adapters (Tasks 14-18)

### Task 14: AnthropicAPIAdapter

**Files:**
- Create: `web-console/src/lib/ai-providers/adapters/anthropic-api.ts`
- Create: `web-console/src/lib/ai-providers/adapters/__tests__/anthropic-api.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/adapters/anthropic-api.ts`**

```ts
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget } from '@/lib/db/queries';
import { getPricingEntry, computeCost } from '@/lib/ai/pricing';
import { getConfig } from '@/lib/db/queries';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicAPIAdapter implements ProviderAdapter {
  id = 'anthropic-api';
  mode = 'api' as const;
  supportedProviders = ['anthropic'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const key = getConfig('anthropic_api_key');
    if (!key) return { available: false, reason: 'Anthropic API Key 未配置' };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('anthropic', null, `Unknown target: ${params.targetId}`);

    const apiKey = getConfig('anthropic_api_key');
    if (!apiKey) throw new ProviderAPIError('anthropic', 401, 'API Key 未配置');

    const body = {
      model: target.model_id,
      max_tokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    };

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError('anthropic', null, err instanceof Error ? err.message : String(err));
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError('anthropic', response.status, text);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
      stop_reason: string;
    };

    const content = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    const usage: Usage = {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      cacheReadTokens: data.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: data.usage.cache_creation_input_tokens ?? 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      rawResponse: data,
    };
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    // Phase 1: non-streaming fallback. Upgrade to SSE in a later task if needed.
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/adapters/__tests__/anthropic-api.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { AnthropicAPIAdapter } from '../anthropic-api';
import { ProviderAPIError } from '../../errors';

describe('AnthropicAPIAdapter', () => {
  let db: Database.Database;
  let adapter: AnthropicAPIAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    // Seed API key
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('anthropic_api_key', 'sk-test-key');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new AnthropicAPIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('detectAvailability returns true when key present', async () => {
    const result = await adapter.detectAvailability('claude-opus-4-6:api');
    expect(result.available).toBe(true);
  });

  it('detectAvailability returns false when key missing', async () => {
    db.prepare('DELETE FROM config WHERE key = ?').run('anthropic_api_key');
    const result = await adapter.detectAvailability('claude-opus-4-6:api');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('未配置');
  });

  it('execute posts to Anthropic API with correct body', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Hello world' }],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'claude-sonnet-4-6:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 100,
    });

    expect(result.content).toBe('Hello world');
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    // Sonnet pricing: 10 * $3/M + 5 * $15/M = $0.00003 + $0.000075 = $0.000105
    expect(result.costUsd).toBeCloseTo(0.000105, 6);
    expect(result.wasCliMode).toBe(false);
  });

  it('execute throws ProviderAPIError on 429', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('rate limit', { status: 429 });
    }) as typeof global.fetch;

    await expect(
      adapter.execute({
        targetId: 'claude-sonnet-4-6:api',
        operationId: 'writer.main',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow(ProviderAPIError);
  });

  it('execute counts cache read tokens correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'cached response' }],
          usage: {
            input_tokens: 1000,
            output_tokens: 100,
            cache_read_input_tokens: 800,
          },
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'claude-sonnet-4-6:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.usage.cacheReadTokens).toBe(800);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test anthropic-api
```
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/adapters/anthropic-api.ts web-console/src/lib/ai-providers/adapters/__tests__/anthropic-api.test.ts
git commit -m "feat(ai): AnthropicAPIAdapter with token/cost accounting"
```

---

### Task 15: OpenAICompatibleAdapter (OpenAI/DeepSeek/Qwen/Zhipu/Moonshot)

**Files:**
- Create: `web-console/src/lib/ai-providers/adapters/openai-compatible.ts`
- Create: `web-console/src/lib/ai-providers/adapters/__tests__/openai-compatible.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/adapters/openai-compatible.ts`**

```ts
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';
import { getPricingEntry, computeCost } from '@/lib/ai/pricing';

/**
 * Unified adapter for OpenAI-compatible providers:
 * - OpenAI: https://api.openai.com/v1/chat/completions
 * - DeepSeek: https://api.deepseek.com/chat/completions
 * - Alibaba Qwen: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
 * - Zhipu GLM: https://open.bigmodel.cn/api/paas/v4/chat/completions
 * - Moonshot Kimi: https://api.moonshot.cn/v1/chat/completions
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  id = 'openai-compatible-api';
  mode = 'api' as const;
  supportedProviders = ['openai', 'deepseek', 'alibaba', 'zhipu', 'moonshot'];

  private endpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    moonshot: 'https://api.moonshot.cn/v1/chat/completions',
  };

  private apiKeyConfigKeys: Record<string, string> = {
    openai: 'openai_api_key',
    deepseek: 'deepseek_api_key',
    alibaba: 'alibaba_api_key',
    zhipu: 'zhipu_api_key',
    moonshot: 'moonshot_api_key',
  };

  async detectAvailability(targetId: string): Promise<AvailabilityCheckResult> {
    const target = getModelTarget(targetId);
    if (!target) return { available: false, reason: 'target 不存在' };
    const keyName = this.apiKeyConfigKeys[target.provider];
    if (!keyName) return { available: false, reason: `未知 provider: ${target.provider}` };
    const key = getConfig(keyName);
    if (!key) return { available: false, reason: `${target.provider} API Key 未配置` };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('unknown', null, `Unknown target: ${params.targetId}`);

    const endpoint = this.endpoints[target.provider];
    if (!endpoint) {
      throw new ProviderAPIError(target.provider, null, `No endpoint for provider ${target.provider}`);
    }

    const apiKey = getConfig(this.apiKeyConfigKeys[target.provider]);
    if (!apiKey) throw new ProviderAPIError(target.provider, 401, 'API Key 未配置');

    const messages: Array<{ role: string; content: string }> = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(...params.messages.map((m) => ({ role: m.role, content: m.content })));

    const body = {
      model: target.model_id,
      messages,
      max_tokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
      temperature: params.temperature,
      stream: false,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError(
        target.provider,
        null,
        err instanceof Error ? err.message : String(err),
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError(target.provider, response.status, text);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
      };
    };

    const content = data.choices[0]?.message.content ?? '';

    const usage: Usage = {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      cacheReadTokens: data.usage.prompt_cache_hit_tokens ?? 0,
      cacheWriteTokens: 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
      rawResponse: data,
    };
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/adapters/__tests__/openai-compatible.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { OpenAICompatibleAdapter } from '../openai-compatible';

describe('OpenAICompatibleAdapter', () => {
  let db: Database.Database;
  let adapter: OpenAICompatibleAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('deepseek_api_key', 'sk-deepseek-test');
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('alibaba_api_key', 'sk-alibaba-test');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new OpenAICompatibleAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('supports 5 providers', () => {
    expect(adapter.supportedProviders).toEqual([
      'openai',
      'deepseek',
      'alibaba',
      'zhipu',
      'moonshot',
    ]);
  });

  it('routes DeepSeek to correct endpoint', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('api.deepseek.com');
  });

  it('routes Alibaba to DashScope endpoint', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'qwen3-max:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('dashscope.aliyuncs.com');
  });

  it('passes API key in Authorization header', async () => {
    let capturedAuth = '';
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get('Authorization') ?? '';
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedAuth).toBe('Bearer sk-deepseek-test');
  });

  it('computes DeepSeek cost correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10000, completion_tokens: 5000 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    // DeepSeek: 10000 * $0.28/M + 5000 * $0.42/M = $0.0028 + $0.0021 = $0.0049
    expect(result.costUsd).toBeCloseTo(0.0049, 5);
  });

  it('detectAvailability returns false for missing key', async () => {
    db.prepare('DELETE FROM config WHERE key = ?').run('openai_api_key');
    const result = await adapter.detectAvailability('gpt-5.4:api');
    expect(result.available).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test openai-compatible
```
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/adapters/openai-compatible.ts web-console/src/lib/ai-providers/adapters/__tests__/openai-compatible.test.ts
git commit -m "feat(ai): OpenAICompatibleAdapter for 5 providers (OpenAI/DeepSeek/Qwen/GLM/Kimi)"
```

---

### Task 16: GeminiAPIAdapter

**Files:**
- Create: `web-console/src/lib/ai-providers/adapters/gemini-api.ts`
- Create: `web-console/src/lib/ai-providers/adapters/__tests__/gemini-api.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/adapters/gemini-api.ts`**

```ts
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';
import { getPricingEntry, computeCost } from '@/lib/ai/pricing';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiAPIAdapter implements ProviderAdapter {
  id = 'google-api';
  mode = 'api' as const;
  supportedProviders = ['google'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const key = getConfig('gemini_api_key');
    if (!key) return { available: false, reason: 'Gemini API Key 未配置' };
    return { available: true };
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('google', null, `Unknown target: ${params.targetId}`);

    const apiKey = getConfig('gemini_api_key');
    if (!apiKey) throw new ProviderAPIError('google', 401, 'API Key 未配置');

    const url = `${BASE_URL}/${target.model_id}:generateContent?key=${apiKey}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const m of params.messages) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? target.max_output_tokens ?? 4096,
        temperature: params.temperature,
      },
    };

    if (params.systemPrompt) {
      body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      throw new ProviderAPIError(
        'google',
        null,
        err instanceof Error ? err.message : String(err),
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderAPIError('google', response.status, text);
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        cachedContentTokenCount?: number;
      };
    };

    const content = data.candidates[0]?.content.parts.map((p) => p.text).join('') ?? '';

    const usage: Usage = {
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
      cacheReadTokens: data.usageMetadata.cachedContentTokenCount ?? 0,
      cacheWriteTokens: 0,
    };

    const pricing = getPricingEntry(params.targetId);
    const costUsd = pricing ? computeCost(pricing, usage) : 0;

    return {
      content,
      usage,
      costUsd,
      wasCliMode: false,
      finishReason: data.candidates[0]?.finishReason === 'STOP' ? 'stop' : 'length',
      rawResponse: data,
    };
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/adapters/__tests__/gemini-api.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { GeminiAPIAdapter } from '../gemini-api';

describe('GeminiAPIAdapter', () => {
  let db: Database.Database;
  let adapter: GeminiAPIAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('gemini_api_key', 'test-gemini-key');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new GeminiAPIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('supports only google provider', () => {
    expect(adapter.supportedProviders).toEqual(['google']);
  });

  it('parses usageMetadata correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: 'gemini reply' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            cachedContentTokenCount: 30,
          },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.content).toBe('gemini reply');
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(50);
    expect(result.usage.cacheReadTokens).toBe(30);
  });

  it('passes API key in URL query param', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('key=test-gemini-key');
  });

  it('maps assistant role to model', async () => {
    let capturedBody: Record<string, unknown> = {};
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second' },
      ],
    });

    const contents = capturedBody.contents as Array<{ role: string }>;
    expect(contents[0].role).toBe('user');
    expect(contents[1].role).toBe('model');
    expect(contents[2].role).toBe('user');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test gemini-api
```
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/adapters/gemini-api.ts web-console/src/lib/ai-providers/adapters/__tests__/gemini-api.test.ts
git commit -m "feat(ai): GeminiAPIAdapter with usageMetadata parsing"
```

---

### Task 17: ClaudeCLIAdapter

**Files:**
- Create: `web-console/src/lib/ai-providers/adapters/claude-cli.ts`
- Create: `web-console/src/lib/ai-providers/adapters/__tests__/claude-cli.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/adapters/claude-cli.ts`**

```ts
import { spawn } from 'node:child_process';
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';

/**
 * Invokes local `claude` CLI in print+stream-json mode.
 * Parses the final `result` message for usage data. Cost is always 0.
 */
export class ClaudeCLIAdapter implements ProviderAdapter {
  id = 'anthropic-cli';
  mode = 'cli' as const;
  supportedProviders = ['anthropic'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const cliPath = getConfig('claude_cli_path') ?? 'claude';
    return new Promise((resolve) => {
      try {
        const proc = spawn(cliPath, ['--version'], { shell: process.platform === 'win32' });
        let resolved = false;
        proc.on('close', (code) => {
          if (resolved) return;
          resolved = true;
          if (code === 0) resolve({ available: true });
          else resolve({ available: false, reason: `claude --version exited with code ${code}` });
        });
        proc.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({ available: false, reason: err.message });
        });
      } catch (err) {
        resolve({
          available: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('anthropic', null, `Unknown target: ${params.targetId}`);

    const cliPath = getConfig('claude_cli_path') ?? 'claude';

    // Build the prompt: join system + messages into a single text
    const promptParts: string[] = [];
    if (params.systemPrompt) {
      promptParts.push(`[System]\n${params.systemPrompt}\n`);
    }
    for (const m of params.messages) {
      promptParts.push(`[${m.role}]\n${m.content}\n`);
    }
    const prompt = promptParts.join('\n');

    return new Promise((resolve, reject) => {
      const args = ['-p', prompt, '--model', target.model_id, '--output-format', 'stream-json', '--verbose'];
      const proc = spawn(cliPath, args, {
        shell: process.platform === 'win32',
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        reject(new ProviderAPIError('anthropic', null, `Spawn failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new ProviderAPIError(
              'anthropic',
              code,
              stderr || `claude CLI exited with code ${code}`,
            ),
          );
          return;
        }

        // Parse stream-json: one JSON object per line
        const lines = stdout.split('\n').filter((l) => l.trim());
        let content = '';
        let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'assistant' && obj.message?.content) {
              const parts = obj.message.content;
              if (Array.isArray(parts)) {
                for (const p of parts) {
                  if (p.type === 'text' && typeof p.text === 'string') content += p.text;
                }
              }
            }
            if (obj.type === 'result' && obj.usage) {
              usage = {
                inputTokens: obj.usage.input_tokens ?? 0,
                outputTokens: obj.usage.output_tokens ?? 0,
                cacheReadTokens: obj.usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: obj.usage.cache_creation_input_tokens ?? 0,
              };
            }
          } catch {
            // Skip non-JSON lines
          }
        }

        resolve({
          content,
          usage,
          costUsd: 0, // CLI mode = free
          wasCliMode: true,
          finishReason: 'stop',
          rawResponse: stdout,
        });
      });

      // Handle abort
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new ProviderAPIError('anthropic', null, 'aborted'));
        });
      }
    });
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai-providers/adapters/__tests__/claude-cli.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { ClaudeCLIAdapter } from '../claude-cli';
import * as childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';

describe('ClaudeCLIAdapter', () => {
  let db: Database.Database;
  let adapter: ClaudeCLIAdapter;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new ClaudeCLIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  function mockSpawn(stdout: string, exitCode = 0) {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: () => void;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = () => {};

    vi.spyOn(childProcess, 'spawn').mockReturnValue(proc as unknown as ReturnType<typeof childProcess.spawn>);

    // Emit async to let caller attach listeners
    setTimeout(() => {
      proc.stdout.emit('data', Buffer.from(stdout, 'utf8'));
      proc.emit('close', exitCode);
    }, 10);

    return proc;
  }

  it('wasCliMode is true and costUsd is 0', async () => {
    const streamJson =
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'hello from CLI' }] },
      }) +
      '\n' +
      JSON.stringify({
        type: 'result',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

    mockSpawn(streamJson, 0);

    const result = await adapter.execute({
      targetId: 'claude-opus-4-6:cli',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.wasCliMode).toBe(true);
    expect(result.costUsd).toBe(0);
    expect(result.content).toBe('hello from CLI');
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
  });

  it('parses cache tokens from stream-json result', async () => {
    const streamJson = JSON.stringify({
      type: 'result',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 80,
        cache_creation_input_tokens: 20,
      },
    });

    mockSpawn(streamJson, 0);

    const result = await adapter.execute({
      targetId: 'claude-opus-4-6:cli',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.usage.cacheReadTokens).toBe(80);
    expect(result.usage.cacheWriteTokens).toBe(20);
  });

  it('rejects on non-zero exit code', async () => {
    mockSpawn('', 1);

    await expect(
      adapter.execute({
        targetId: 'claude-opus-4-6:cli',
        operationId: 'writer.main',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test claude-cli
```
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai-providers/adapters/claude-cli.ts web-console/src/lib/ai-providers/adapters/__tests__/claude-cli.test.ts
git commit -m "feat(ai): ClaudeCLIAdapter with stream-json usage parsing"
```

---

### Task 18: GeminiCLIAdapter + adapter registration

**Files:**
- Create: `web-console/src/lib/ai-providers/adapters/gemini-cli.ts`
- Create: `web-console/src/lib/ai-providers/adapters/index.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai-providers/adapters/gemini-cli.ts`**

```ts
import { spawn } from 'node:child_process';
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';

/**
 * Invokes local `gemini` CLI. Gemini CLI's usage output format is less
 * structured than Claude CLI — we best-effort parse common patterns,
 * fall back to zero token counts if not found. Cost is always 0.
 */
export class GeminiCLIAdapter implements ProviderAdapter {
  id = 'google-cli';
  mode = 'cli' as const;
  supportedProviders = ['google'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const cliPath = getConfig('gemini_cli_path') ?? 'gemini';
    return new Promise((resolve) => {
      try {
        const proc = spawn(cliPath, ['--version'], { shell: process.platform === 'win32' });
        let resolved = false;
        proc.on('close', (code) => {
          if (resolved) return;
          resolved = true;
          if (code === 0) resolve({ available: true });
          else resolve({ available: false, reason: `gemini --version exited ${code}` });
        });
        proc.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({ available: false, reason: err.message });
        });
      } catch (err) {
        resolve({ available: false, reason: err instanceof Error ? err.message : String(err) });
      }
    });
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('google', null, `Unknown target: ${params.targetId}`);

    const cliPath = getConfig('gemini_cli_path') ?? 'gemini';
    const promptParts: string[] = [];
    if (params.systemPrompt) promptParts.push(params.systemPrompt);
    for (const m of params.messages) promptParts.push(m.content);
    const prompt = promptParts.join('\n\n');

    return new Promise((resolve, reject) => {
      const proc = spawn(cliPath, ['-p', prompt, '--model', target.model_id], {
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        reject(new ProviderAPIError('google', null, `Spawn failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new ProviderAPIError(
              'google',
              code,
              stderr || `gemini CLI exited with code ${code}`,
            ),
          );
          return;
        }

        // Rough token estimate from character count (Gemini CLI doesn't always
        // expose usage). 4 chars ≈ 1 token for English, ~1.5 chars ≈ 1 token for Chinese.
        const approxTokens = Math.ceil(stdout.length / 3);
        const usage: Usage = {
          inputTokens: Math.ceil(prompt.length / 3),
          outputTokens: approxTokens,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        };

        resolve({
          content: stdout,
          usage,
          costUsd: 0,
          wasCliMode: true,
          finishReason: 'stop',
          rawResponse: stdout,
        });
      });

      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new ProviderAPIError('google', null, 'aborted'));
        });
      }
    });
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
```

- [ ] **Step 2: Create `web-console/src/lib/ai-providers/adapters/index.ts`**

```ts
import { registerAdapter } from '../factory';
import { AnthropicAPIAdapter } from './anthropic-api';
import { OpenAICompatibleAdapter } from './openai-compatible';
import { GeminiAPIAdapter } from './gemini-api';
import { ClaudeCLIAdapter } from './claude-cli';
import { GeminiCLIAdapter } from './gemini-cli';

let registered = false;

/** Register all built-in adapters (idempotent). */
export function registerAllAdapters(): void {
  if (registered) return;
  registerAdapter(new AnthropicAPIAdapter());
  registerAdapter(new OpenAICompatibleAdapter());
  registerAdapter(new GeminiAPIAdapter());
  registerAdapter(new ClaudeCLIAdapter());
  registerAdapter(new GeminiCLIAdapter());
  registered = true;
}
```

- [ ] **Step 3: Commit**

```bash
git add web-console/src/lib/ai-providers/adapters/gemini-cli.ts web-console/src/lib/ai-providers/adapters/index.ts
git commit -m "feat(ai): GeminiCLIAdapter + adapter registration entry point"
```

---

## Phase 1.D: Execution Layer (Tasks 19-20)

### Task 19: runOperation unified entry point

**Files:**
- Create: `web-console/src/lib/ai/run-operation.ts`
- Create: `web-console/src/lib/ai/__tests__/run-operation.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/run-operation.ts`**

```ts
import type { ExecuteParams, ExecuteResult, StreamChunk } from '@/lib/ai-providers/types';
import { resolveOperationTarget } from './resolve-target';
import { enforceBudget } from './budget';
import { getAdapterForTarget } from '@/lib/ai-providers/factory';
import { insertTokenUsageV2 } from '@/lib/db/queries';
import { createFailureSnapshot } from './snapshots';
import { OperationFailedError } from '@/lib/ai-providers/errors';
import { registerAllAdapters } from '@/lib/ai-providers/adapters';

// Ensure adapters are registered before first call
registerAllAdapters();

export type RunParams = Omit<ExecuteParams, 'targetId' | 'operationId'>;

/**
 * Execute an operation: resolve target → enforce budget → dispatch adapter →
 * record usage → on failure, create snapshot and throw OperationFailedError.
 */
export async function runOperation(
  operationId: string,
  params: RunParams,
): Promise<ExecuteResult> {
  // 1. Resolve target (throws if not configured / disabled)
  const target = resolveOperationTarget(operationId);

  // 2. Enforce budget
  enforceBudget(operationId);

  // 3. Dispatch
  const adapter = getAdapterForTarget(target.id);
  const fullParams: ExecuteParams = {
    ...params,
    targetId: target.id,
    operationId,
  };

  try {
    const result = await adapter.execute(fullParams);

    // 4. Record usage
    insertTokenUsageV2({
      cli_type: adapter.mode,
      model: target.model_id,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cache_read_tokens: result.usage.cacheReadTokens,
      cache_write_tokens: result.usage.cacheWriteTokens,
      target_id: target.id,
      operation_id: operationId,
      cost_usd: result.costUsd,
      was_cli_mode: result.wasCliMode,
    });

    return result;
  } catch (err) {
    // 5. Create snapshot
    const snapshot = await createFailureSnapshot({
      operationId,
      targetId: target.id,
      params: fullParams,
      error: err instanceof Error ? err : new Error(String(err)),
    });

    throw new OperationFailedError(
      operationId,
      err instanceof Error ? err : new Error(String(err)),
      snapshot.id,
    );
  }
}

/**
 * Streaming version. Records usage only when stream completes successfully.
 */
export async function* runOperationStream(
  operationId: string,
  params: RunParams,
): AsyncIterable<StreamChunk> {
  const target = resolveOperationTarget(operationId);
  enforceBudget(operationId);

  const adapter = getAdapterForTarget(target.id);
  const fullParams: ExecuteParams = { ...params, targetId: target.id, operationId };

  let finalUsage: ExecuteResult['usage'] | null = null;

  try {
    for await (const chunk of adapter.stream(fullParams)) {
      if (chunk.type === 'usage') {
        finalUsage = chunk.usage;
      }
      yield chunk;
    }

    if (finalUsage) {
      // Cost from adapter's computeCost — re-fetch via execute() is expensive; compute locally
      const { getPricingEntry, computeCost } = await import('./pricing');
      const pricing = getPricingEntry(target.id);
      const costUsd = pricing ? computeCost(pricing, finalUsage) : 0;

      insertTokenUsageV2({
        cli_type: adapter.mode,
        model: target.model_id,
        input_tokens: finalUsage.inputTokens,
        output_tokens: finalUsage.outputTokens,
        cache_read_tokens: finalUsage.cacheReadTokens,
        cache_write_tokens: finalUsage.cacheWriteTokens,
        target_id: target.id,
        operation_id: operationId,
        cost_usd: costUsd,
        was_cli_mode: adapter.mode === 'cli',
      });
    }
  } catch (err) {
    const snapshot = await createFailureSnapshot({
      operationId,
      targetId: target.id,
      params: fullParams,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw new OperationFailedError(
      operationId,
      err instanceof Error ? err : new Error(String(err)),
      snapshot.id,
    );
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/run-operation.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import {
  registerAdapter,
  __clearAdapters,
} from '@/lib/ai-providers/factory';
import type { ProviderAdapter } from '@/lib/ai-providers/types';
import { OperationFailedError, ProviderAPIError } from '@/lib/ai-providers/errors';

function makeAdapter(providers: string[], mode: 'api' | 'cli', impl: {
  execute?: () => Promise<unknown>;
  stream?: () => AsyncIterable<unknown>;
}): ProviderAdapter {
  return {
    id: `test-${providers.join(',')}-${mode}`,
    mode,
    supportedProviders: providers,
    async detectAvailability() { return { available: true }; },
    execute: impl.execute ?? (async () => ({
      content: 'ok',
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.001,
      wasCliMode: mode === 'cli',
      finishReason: 'stop' as const,
    })),
    stream: impl.stream ?? (async function* () {
      yield { type: 'done' as const };
    }),
  } as ProviderAdapter;
}

describe('runOperation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    __clearAdapters();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('happy path: runs, records usage, returns result', async () => {
    const { setCategoryDefault } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-sonnet-4-6:api');

    registerAdapter(makeAdapter(['anthropic'], 'api', {}));

    const { runOperation } = await import('../run-operation');
    const result = await runOperation('writer.main', {
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.content).toBe('ok');

    // Verify token_usage row
    const rows = db.prepare('SELECT * FROM token_usage').all() as Array<{ operation_id: string; cost_usd: number }>;
    expect(rows.length).toBe(1);
    expect(rows[0].operation_id).toBe('writer.main');
    expect(rows[0].cost_usd).toBe(0.001);
  });

  it('failure creates snapshot and throws OperationFailedError', async () => {
    const { setCategoryDefault } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-sonnet-4-6:api');

    registerAdapter(
      makeAdapter(['anthropic'], 'api', {
        execute: async () => {
          throw new ProviderAPIError('anthropic', 429, 'rate limit');
        },
      }),
    );

    const { runOperation } = await import('../run-operation');
    await expect(
      runOperation('writer.main', { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(OperationFailedError);

    const { listSnapshots } = await import('@/lib/db/queries');
    const snapshots = listSnapshots();
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].operation_id).toBe('writer.main');
  });

  it('unconfigured operation throws before adapter dispatch', async () => {
    registerAdapter(makeAdapter(['anthropic'], 'api', {}));

    const { runOperation } = await import('../run-operation');
    await expect(
      runOperation('writer.main', { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/OperationNotConfigured|has no model binding/);

    // No snapshot because error was pre-dispatch
    const { listSnapshots } = await import('@/lib/db/queries');
    expect(listSnapshots().length).toBe(0);
  });

  it('disabled operation is rejected', async () => {
    const { setCategoryDefault, setOperationEnabled } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-sonnet-4-6:api');
    setOperationEnabled('writer.main', false);

    registerAdapter(makeAdapter(['anthropic'], 'api', {}));

    const { runOperation } = await import('../run-operation');
    await expect(
      runOperation('writer.main', { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/disabled/);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test run-operation
```
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/run-operation.ts web-console/src/lib/ai/__tests__/run-operation.test.ts
git commit -m "feat(ai): runOperation unified entry with snapshot on failure"
```

---

### Task 20: Snapshot resume + fallback analysis wiring

**Files:**
- Modify: `web-console/src/lib/ai/snapshots.ts` (wire `attemptFallbackAnalysis` to use runOperation)
- Create: `web-console/src/lib/ai/resume.ts`
- Create: `web-console/src/lib/ai/__tests__/resume.test.ts`

- [ ] **Step 1: Modify `web-console/src/lib/ai/snapshots.ts` — replace the stub `attemptFallbackAnalysis`**

Replace the existing placeholder body of `attemptFallbackAnalysis` with:

```ts
export async function attemptFallbackAnalysis(
  ctx: FailureContext,
): Promise<{ summary: string; hint: string }> {
  const { getBudgetConfig } = await import('@/lib/db/queries');
  const budget = getBudgetConfig();
  if (!budget.fallback_target_id) {
    throw new Error('No fallback target configured');
  }

  const { getAdapterForTarget } = await import('@/lib/ai-providers/factory');
  const adapter = getAdapterForTarget(budget.fallback_target_id);

  const analysisPrompt = `You are a failure analysis assistant. An AI operation just failed.

Operation: ${ctx.operationId}
Target: ${ctx.targetId}
Error: ${ctx.error.message}

Please analyze and output EXACTLY this JSON (no preamble, no code fences):
{
  "summary": "one-sentence description of what was being attempted",
  "hint": "specific recommendation for resuming"
}`;

  const result = await adapter.execute({
    targetId: budget.fallback_target_id,
    operationId: ctx.operationId,
    messages: [{ role: 'user', content: analysisPrompt }],
    maxTokens: 500,
    temperature: 0.2,
  });

  // Try to parse JSON from response
  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Fallback model did not return valid JSON');

  const parsed = JSON.parse(match[0]) as { summary: string; hint: string };
  if (typeof parsed.summary !== 'string' || typeof parsed.hint !== 'string') {
    throw new Error('Fallback model returned malformed analysis');
  }
  return parsed;
}
```

- [ ] **Step 2: Create `web-console/src/lib/ai/resume.ts`**

```ts
import { readSnapshotPayload, markResumed } from './snapshots';
import { runOperation, type RunParams } from './run-operation';
import { getSnapshot } from '@/lib/db/queries';
import type { ExecuteResult } from '@/lib/ai-providers/types';

/**
 * Resume a pending snapshot by re-invoking runOperation with the original params.
 * IMPORTANT: does NOT reuse the original target_id — re-reads current config so
 * user can change the binding before resuming.
 */
export async function resumeSnapshot(snapshotId: string): Promise<ExecuteResult> {
  const snap = getSnapshot(snapshotId);
  if (!snap) throw new Error(`Snapshot ${snapshotId} not found`);
  if (snap.status !== 'pending') {
    throw new Error(`Snapshot ${snapshotId} is not pending (status: ${snap.status})`);
  }

  const payload = (await readSnapshotPayload(snapshotId)) as {
    operationId: string;
    params: RunParams;
  };

  // Strip targetId + operationId from params (runOperation re-resolves)
  const { targetId: _t, operationId: _o, ...rest } = payload.params as RunParams & {
    targetId?: string;
    operationId?: string;
  };

  const result = await runOperation(payload.operationId, rest);
  markResumed(snapshotId);
  return result;
}
```

- [ ] **Step 3: Write test `web-console/src/lib/ai/__tests__/resume.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import { registerAdapter, __clearAdapters } from '@/lib/ai-providers/factory';
import type { ProviderAdapter } from '@/lib/ai-providers/types';
import { ProviderAPIError } from '@/lib/ai-providers/errors';

const SNAPSHOT_DIR = path.resolve(process.cwd(), '..', 'workspace', 'snapshots');

describe('resumeSnapshot', () => {
  let db: Database.Database;
  let callCount = 0;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    __clearAdapters();
    callCount = 0;
    await mkdir(SNAPSHOT_DIR, { recursive: true });
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    try {
      await rm(SNAPSHOT_DIR, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('fails first, resumes successfully after config change', async () => {
    const { setCategoryDefault, setOperationOverride } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-opus-4-6:api');

    // Adapter that fails first call, succeeds on second
    const adapter: ProviderAdapter = {
      id: 'test-anthropic-api',
      mode: 'api',
      supportedProviders: ['anthropic'],
      async detectAvailability() { return { available: true }; },
      async execute(params) {
        callCount++;
        if (callCount === 1) {
          throw new ProviderAPIError('anthropic', 429, 'rate limit');
        }
        return {
          content: `success on try ${callCount} target=${params.targetId}`,
          usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: 0.0001,
          wasCliMode: false,
          finishReason: 'stop',
        };
      },
      async *stream() { yield { type: 'done' }; },
    };
    registerAdapter(adapter);

    // First call fails and creates snapshot
    const { runOperation } = await import('../run-operation');
    let snapshotId = '';
    try {
      await runOperation('writer.main', {
        messages: [{ role: 'user', content: 'hi' }],
      });
    } catch (err) {
      const { OperationFailedError } = await import('@/lib/ai-providers/errors');
      if (err instanceof OperationFailedError) snapshotId = err.snapshotId;
    }
    expect(snapshotId).toBeTruthy();

    // User changes config: override writer.main to sonnet
    setOperationOverride('writer.main', 'claude-sonnet-4-6:api');

    // Resume
    const { resumeSnapshot } = await import('../resume');
    const result = await resumeSnapshot(snapshotId);

    expect(result.content).toContain('claude-sonnet-4-6:api');

    // Verify snapshot marked resumed
    const { getSnapshot } = await import('@/lib/db/queries');
    const row = getSnapshot(snapshotId);
    expect(row?.status).toBe('resumed');
  });

  it('rejects already-resumed snapshot', async () => {
    const { setCategoryDefault } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-sonnet-4-6:api');

    registerAdapter({
      id: 'test',
      mode: 'api',
      supportedProviders: ['anthropic'],
      async detectAvailability() { return { available: true }; },
      async execute() {
        throw new ProviderAPIError('anthropic', 429, 'rate limit');
      },
      async *stream() { yield { type: 'done' }; },
    });

    const { runOperation } = await import('../run-operation');
    let snapshotId = '';
    try {
      await runOperation('writer.main', { messages: [{ role: 'user', content: 'x' }] });
    } catch (err) {
      const { OperationFailedError } = await import('@/lib/ai-providers/errors');
      if (err instanceof OperationFailedError) snapshotId = err.snapshotId;
    }

    const { markResumed } = await import('../snapshots');
    markResumed(snapshotId);

    const { resumeSnapshot } = await import('../resume');
    await expect(resumeSnapshot(snapshotId)).rejects.toThrow(/not pending/);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd web-console && pnpm test resume
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add web-console/src/lib/ai/snapshots.ts web-console/src/lib/ai/resume.ts web-console/src/lib/ai/__tests__/resume.test.ts
git commit -m "feat(ai): resumeSnapshot + wire fallback analysis to runOperation"
```

---

## Phase 1.E: Presets (Task 21)

### Task 21: Preset definitions + applyPreset

**Files:**
- Create: `web-console/src/lib/ai/presets.ts`
- Create: `web-console/src/lib/ai/__tests__/presets.test.ts`

- [ ] **Step 1: Create `web-console/src/lib/ai/presets.ts`**

```ts
import {
  setCategoryDefault,
  setOperationOverride,
  clearOperationOverride,
  clearCategoryDefault,
} from '@/lib/db/queries';

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  estimatedCost100Chapters: string;
  requirements: string[];
  categoryDefaults: Record<string, string>;
  overrides: Record<string, string>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'balanced',
    name: '🎯 平衡（API）',
    description: '国际题材、中英混合，2 渠道兼顾质量与成本',
    channelCount: 2,
    estimatedCost100Chapters: '~$38',
    requirements: ['Anthropic API Key', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:api',
      lore: 'claude-sonnet-4-6:api',
      outline: 'claude-sonnet-4-6:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:api',
      'showrunner.decide': 'claude-opus-4-6:api',
      'writer.architect': 'claude-opus-4-6:api',
      'writer.main': 'claude-sonnet-4-6:api',
      'writer.final_revise': 'claude-sonnet-4-6:api',
      'critic.review': 'claude-sonnet-4-6:api',
    },
  },
  {
    id: 'chinese-optimized',
    name: '📖 中文优化',
    description: '针对中文网文，主要用 Qwen 系列',
    channelCount: 2,
    estimatedCost100Chapters: '~$15',
    requirements: ['Anthropic API Key', 'Alibaba Qwen API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:api',
      lore: 'qwen3-max:api',
      outline: 'qwen3-max:api',
      showrunner: 'qwen3.5-flash:api',
      writer: 'qwen3.5-flash:api',
      review: 'qwen3.5-flash:api',
      context: 'qwen3.5-flash:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:api',
      'showrunner.decide': 'claude-opus-4-6:api',
      'writer.architect': 'claude-opus-4-6:api',
      'writer.main': 'qwen3-max:api',
      'writer.final_revise': 'qwen3-max:api',
      'lore.style.generate': 'qwen3-max:api',
    },
  },
  {
    id: 'budget',
    name: '💰 极致性价比',
    description: '全部 DeepSeek V3.2，最低成本',
    channelCount: 1,
    estimatedCost100Chapters: '~$3',
    requirements: ['DeepSeek API Key'],
    categoryDefaults: {
      project: 'deepseek-chat:api',
      lore: 'deepseek-chat:api',
      outline: 'deepseek-chat:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {},
  },
  {
    id: 'top-performance',
    name: '🏆 榜首性能',
    description: 'Gemini 3.1 Pro 指挥 + Sonnet 质量门 + DeepSeek 执行',
    channelCount: 3,
    estimatedCost100Chapters: '~$45',
    requirements: ['Anthropic API Key', 'Google Gemini API Key', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'gemini-3.1-pro:api',
      lore: 'claude-sonnet-4-6:api',
      outline: 'claude-sonnet-4-6:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'gemini-3.1-pro:api',
      'showrunner.decide': 'gemini-3.1-pro:api',
      'writer.architect': 'gemini-3.1-pro:api',
      'writer.main': 'claude-sonnet-4-6:api',
      'writer.final_revise': 'claude-sonnet-4-6:api',
      'critic.review': 'claude-sonnet-4-6:api',
    },
  },
  {
    id: 'cli-only',
    name: '🎟 纯订阅党',
    description: '全部用本机 Claude CLI，$0 边际成本',
    channelCount: 1,
    estimatedCost100Chapters: '$0 边际',
    requirements: ['Claude Max 订阅', '本机 claude CLI'],
    categoryDefaults: {
      project: 'claude-opus-4-6:cli',
      lore: 'claude-sonnet-4-6:cli',
      outline: 'claude-sonnet-4-6:cli',
      showrunner: 'claude-haiku-4-5:cli',
      writer: 'claude-haiku-4-5:cli',
      review: 'claude-haiku-4-5:cli',
      context: 'claude-haiku-4-5:cli',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:cli',
      'showrunner.decide': 'claude-opus-4-6:cli',
      'writer.architect': 'claude-opus-4-6:cli',
      'writer.main': 'claude-sonnet-4-6:cli',
      'writer.final_revise': 'claude-sonnet-4-6:cli',
      'critic.review': 'claude-sonnet-4-6:cli',
    },
  },
  {
    id: 'cli-api-hybrid',
    name: '🔀 订阅+API 混合',
    description: 'Claude CLI 指挥 + DeepSeek API 执行',
    channelCount: 2,
    estimatedCost100Chapters: '~$3',
    requirements: ['Claude Max 订阅', '本机 claude CLI', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:cli',
      lore: 'claude-sonnet-4-6:cli',
      outline: 'claude-sonnet-4-6:cli',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:cli',
      'showrunner.decide': 'claude-opus-4-6:cli',
      'writer.architect': 'claude-opus-4-6:cli',
      'writer.main': 'claude-sonnet-4-6:cli',
      'writer.final_revise': 'claude-sonnet-4-6:cli',
      'critic.review': 'claude-sonnet-4-6:cli',
    },
  },
];

export function getPreset(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * Apply a preset: wipes existing overrides and category defaults,
 * then writes the preset's bindings.
 */
export function applyPreset(presetId: string): void {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);

  // Clear existing bindings for the categories the preset covers
  for (const category of Object.keys(preset.categoryDefaults)) {
    clearCategoryDefault(category);
  }
  // Clear all overrides (we'll re-add the preset's)
  const { getDb } = require('@/lib/db/index') as typeof import('@/lib/db/index');
  getDb().prepare('DELETE FROM operation_overrides').run();

  // Apply new bindings
  for (const [category, targetId] of Object.entries(preset.categoryDefaults)) {
    setCategoryDefault(category, targetId);
  }
  for (const [operationId, targetId] of Object.entries(preset.overrides)) {
    setOperationOverride(operationId, targetId);
  }
}
```

- [ ] **Step 2: Write test `web-console/src/lib/ai/__tests__/presets.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('presets', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('has 6 presets', async () => {
    const { PRESETS } = await import('../presets');
    expect(PRESETS.length).toBe(6);
  });

  it('all preset target IDs exist in model_targets', async () => {
    const { PRESETS } = await import('../presets');
    const { listModelTargets } = await import('@/lib/db/queries');
    const validIds = new Set(listModelTargets().map((t) => t.id));

    for (const preset of PRESETS) {
      for (const targetId of Object.values(preset.categoryDefaults)) {
        expect(validIds.has(targetId)).toBe(true);
      }
      for (const targetId of Object.values(preset.overrides)) {
        expect(validIds.has(targetId)).toBe(true);
      }
    }
  });

  it('applyPreset sets category defaults and overrides', async () => {
    const { applyPreset } = await import('../presets');
    const { getCategoryDefault, getOperationOverride } = await import('@/lib/db/queries');

    applyPreset('balanced');

    expect(getCategoryDefault('writer')).toBe('deepseek-chat:api');
    expect(getOperationOverride('writer.main')).toBe('claude-sonnet-4-6:api');
    expect(getOperationOverride('writer.architect')).toBe('claude-opus-4-6:api');
  });

  it('applyPreset wipes old bindings first', async () => {
    const { applyPreset } = await import('../presets');
    const { getCategoryDefault, getOperationOverride, setOperationOverride } =
      await import('@/lib/db/queries');

    // Pre-existing override that isn't in the preset
    setOperationOverride('writer.foreshadow_weaver', 'claude-opus-4-6:api');

    applyPreset('balanced');

    // Should be cleared because balanced doesn't override foreshadow_weaver
    expect(getOperationOverride('writer.foreshadow_weaver')).toBeUndefined();
    // But balanced's own overrides should be set
    expect(getOperationOverride('writer.main')).toBe('claude-sonnet-4-6:api');
  });

  it('budget preset uses only DeepSeek', async () => {
    const { PRESETS } = await import('../presets');
    const budget = PRESETS.find((p) => p.id === 'budget')!;
    for (const targetId of Object.values(budget.categoryDefaults)) {
      expect(targetId).toBe('deepseek-chat:api');
    }
    expect(Object.keys(budget.overrides).length).toBe(0);
  });

  it('cli-only preset uses only CLI targets', async () => {
    const { PRESETS } = await import('../presets');
    const cli = PRESETS.find((p) => p.id === 'cli-only')!;
    for (const targetId of Object.values(cli.categoryDefaults)) {
      expect(targetId).toMatch(/:cli$/);
    }
    for (const targetId of Object.values(cli.overrides)) {
      expect(targetId).toMatch(/:cli$/);
    }
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd web-console && pnpm test presets
```
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add web-console/src/lib/ai/presets.ts web-console/src/lib/ai/__tests__/presets.test.ts
git commit -m "feat(ai): 6 preset definitions with applyPreset"
```

---

## Phase 1.F: API Routes (Tasks 22-27)

### Task 22: POST /api/operation/run

**Files:**
- Create: `web-console/src/app/api/operation/run/route.ts`

- [ ] **Step 1: Create `web-console/src/app/api/operation/run/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runOperation } from '@/lib/ai/run-operation';
import {
  OperationNotConfiguredError,
  OperationDisabledError,
  BudgetHardBlockedError,
  BudgetSoftBlockedError,
  OperationFailedError,
} from '@/lib/ai-providers/errors';

export async function POST(request: Request) {
  let body: {
    operation_id: string;
    system_prompt?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    max_tokens?: number;
    temperature?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.operation_id || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { ok: false, error: 'operation_id and messages are required' },
      { status: 400 },
    );
  }

  try {
    const result = await runOperation(body.operation_id, {
      systemPrompt: body.system_prompt,
      messages: body.messages,
      maxTokens: body.max_tokens,
      temperature: body.temperature,
    });

    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      costUsd: result.costUsd,
      wasCliMode: result.wasCliMode,
      finishReason: result.finishReason,
    });
  } catch (err) {
    if (err instanceof OperationNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'NOT_CONFIGURED' },
        { status: 400 },
      );
    }
    if (err instanceof OperationDisabledError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'DISABLED' },
        { status: 400 },
      );
    }
    if (err instanceof BudgetHardBlockedError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'BUDGET_HARD_BLOCK' },
        { status: 402 },
      );
    }
    if (err instanceof BudgetSoftBlockedError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'BUDGET_SOFT_BLOCK' },
        { status: 402 },
      );
    }
    if (err instanceof OperationFailedError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: 'OPERATION_FAILED',
          snapshotId: err.snapshotId,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web-console/src/app/api/operation/run/route.ts
git commit -m "feat(api): POST /api/operation/run unified AI execution endpoint"
```

---

### Task 23: Operations/targets/bindings REST endpoints

**Files:**
- Create: `web-console/src/app/api/operations/route.ts`
- Create: `web-console/src/app/api/operations/[id]/route.ts`
- Create: `web-console/src/app/api/targets/route.ts`
- Create: `web-console/src/app/api/bindings/category/route.ts`
- Create: `web-console/src/app/api/bindings/override/route.ts`

- [ ] **Step 1: Create `web-console/src/app/api/operations/route.ts`**

```ts
import { NextResponse } from 'next/server';
import {
  listOperations,
  getCategoryDefault,
  getOperationOverride,
  listModelTargets,
} from '@/lib/db/queries';

/** GET /api/operations — returns all operations with resolved bindings */
export async function GET() {
  const operations = listOperations();
  const targets = listModelTargets();
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  const result = operations.map((op) => {
    const overrideId = getOperationOverride(op.id);
    const categoryDefaultId = getCategoryDefault(op.category);
    const effectiveTargetId = overrideId ?? categoryDefaultId ?? null;
    const effectiveTarget = effectiveTargetId ? targetMap.get(effectiveTargetId) : null;

    return {
      id: op.id,
      category: op.category,
      displayName: op.display_name,
      description: op.description,
      recommendedTier: op.recommended_tier,
      recommendedRationale: op.recommended_rationale,
      isEnabled: op.is_enabled === 1,
      sortOrder: op.sort_order,
      override: overrideId,
      categoryDefault: categoryDefaultId,
      effectiveTarget: effectiveTarget
        ? {
            id: effectiveTarget.id,
            displayName: effectiveTarget.display_name,
            provider: effectiveTarget.provider,
            mode: effectiveTarget.mode,
          }
        : null,
      isOverridden: overrideId != null,
    };
  });

  return NextResponse.json({ operations: result });
}
```

- [ ] **Step 2: Create `web-console/src/app/api/operations/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { setOperationEnabled, getOperation } from '@/lib/db/queries';

interface Context {
  params: Promise<{ id: string }>;
}

/** PATCH /api/operations/:id — toggle is_enabled */
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const op = getOperation(id);
  if (!op) {
    return NextResponse.json({ ok: false, error: 'Operation not found' }, { status: 404 });
  }

  const body = (await request.json()) as { is_enabled?: boolean };
  if (typeof body.is_enabled !== 'boolean') {
    return NextResponse.json(
      { ok: false, error: 'is_enabled boolean required' },
      { status: 400 },
    );
  }

  setOperationEnabled(id, body.is_enabled);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `web-console/src/app/api/targets/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { listModelTargets } from '@/lib/db/queries';

/** GET /api/targets — list all model targets */
export async function GET() {
  const targets = listModelTargets();
  return NextResponse.json({
    targets: targets.map((t) => ({
      id: t.id,
      modelId: t.model_id,
      provider: t.provider,
      mode: t.mode,
      displayName: t.display_name,
      description: t.description,
      inputPricePer1M: t.input_price_per_1m,
      outputPricePer1M: t.output_price_per_1m,
      cacheReadPricePer1M: t.cache_read_price_per_1m,
      contextWindow: t.context_window,
      tier: t.tier,
      available: t.available === 1,
      availabilityReason: t.availability_reason,
      lastCheckedAt: t.last_checked_at,
    })),
  });
}
```

- [ ] **Step 4: Create `web-console/src/app/api/bindings/category/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { setCategoryDefault, clearCategoryDefault } from '@/lib/db/queries';

/** POST /api/bindings/category — set a category default */
export async function POST(request: Request) {
  const body = (await request.json()) as { category?: string; target_id?: string };
  if (!body.category) {
    return NextResponse.json({ ok: false, error: 'category required' }, { status: 400 });
  }

  if (!body.target_id) {
    clearCategoryDefault(body.category);
  } else {
    setCategoryDefault(body.category, body.target_id);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create `web-console/src/app/api/bindings/override/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { setOperationOverride, clearOperationOverride } from '@/lib/db/queries';

/** POST /api/bindings/override — set an operation override. Empty target_id clears it. */
export async function POST(request: Request) {
  const body = (await request.json()) as { operation_id?: string; target_id?: string };
  if (!body.operation_id) {
    return NextResponse.json({ ok: false, error: 'operation_id required' }, { status: 400 });
  }

  if (!body.target_id) {
    clearOperationOverride(body.operation_id);
  } else {
    setOperationOverride(body.operation_id, body.target_id);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add web-console/src/app/api/operations/route.ts web-console/src/app/api/operations/\[id\]/route.ts web-console/src/app/api/targets/route.ts web-console/src/app/api/bindings/category/route.ts web-console/src/app/api/bindings/override/route.ts
git commit -m "feat(api): operations/targets/bindings CRUD endpoints"
```

---

### Task 24: Snapshots + budget endpoints

**Files:**
- Create: `web-console/src/app/api/snapshots/route.ts`
- Create: `web-console/src/app/api/snapshots/[id]/resume/route.ts`
- Create: `web-console/src/app/api/snapshots/[id]/abandon/route.ts`
- Create: `web-console/src/app/api/budget/route.ts`
- Create: `web-console/src/app/api/budget/check/route.ts`

- [ ] **Step 1: Create `web-console/src/app/api/snapshots/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { listSnapshots } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') as
    | 'pending'
    | 'resumed'
    | 'abandoned'
    | null;

  const rows = listSnapshots(status ?? undefined);
  return NextResponse.json({ snapshots: rows });
}
```

- [ ] **Step 2: Create `web-console/src/app/api/snapshots/[id]/resume/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { resumeSnapshot } from '@/lib/ai/resume';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const result = await resumeSnapshot(id);
    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      costUsd: result.costUsd,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Create `web-console/src/app/api/snapshots/[id]/abandon/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { markAbandoned } from '@/lib/ai/snapshots';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  markAbandoned(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create `web-console/src/app/api/budget/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getBudgetConfig, updateBudgetConfig } from '@/lib/db/queries';

export async function GET() {
  const cfg = getBudgetConfig();
  return NextResponse.json({ budget: cfg });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    daily_budget_usd?: number;
    warn_threshold_pct?: number;
    soft_block_threshold_pct?: number;
    hard_block_threshold_pct?: number;
    fallback_target_id?: string | null;
  };

  updateBudgetConfig(body);
  return NextResponse.json({ ok: true, budget: getBudgetConfig() });
}
```

- [ ] **Step 5: Create `web-console/src/app/api/budget/check/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { checkBudget } from '@/lib/ai/budget';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opId = url.searchParams.get('operation_id') ?? 'project.brainstorm';
  try {
    const state = checkBudget(opId);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add web-console/src/app/api/snapshots web-console/src/app/api/budget
git commit -m "feat(api): snapshots + budget endpoints"
```

---

### Task 25: Usage/analytics + presets/availability endpoints

**Files:**
- Create: `web-console/src/app/api/usage/summary/route.ts`
- Create: `web-console/src/app/api/usage/by-operation/route.ts`
- Create: `web-console/src/app/api/usage/timeseries/route.ts`
- Create: `web-console/src/app/api/presets/route.ts`
- Create: `web-console/src/app/api/presets/apply/route.ts`
- Create: `web-console/src/app/api/targets/detect/route.ts`
- Create: `web-console/src/app/api/targets/refresh-pricing/route.ts`
- Modify: `web-console/src/lib/db/queries.ts` (add aggregate queries)

- [ ] **Step 1: Add usage aggregate queries to `web-console/src/lib/db/queries.ts`**

Append:

```ts
export interface UsageSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  cliSavedMonth: number;
}

export function getUsageSummary(): UsageSummary {
  const db = getDb();
  const today = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE date(timestamp) = date('now')`)
    .get() as { t: number }).t;
  const week = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE timestamp >= datetime('now', '-7 days')`)
    .get() as { t: number }).t;
  const month = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE timestamp >= datetime('now', '-30 days')`)
    .get() as { t: number }).t;
  const total = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage`)
    .get() as { t: number }).t;

  // Approximate CLI savings: for CLI-mode rows, compute what it would cost via API equivalent
  // (naive: use the same model's API pricing if such a target exists)
  const cliSavedMonth = (db
    .prepare(
      `SELECT COALESCE(SUM(
         CASE
           WHEN mt_api.input_price_per_1m IS NOT NULL
           THEN (tu.input_tokens * mt_api.input_price_per_1m / 1000000.0) +
                (tu.output_tokens * mt_api.output_price_per_1m / 1000000.0)
           ELSE 0
         END
       ), 0) as saved
       FROM token_usage tu
       LEFT JOIN model_targets mt ON tu.target_id = mt.id
       LEFT JOIN model_targets mt_api ON mt.model_id = mt_api.model_id AND mt_api.mode = 'api'
       WHERE tu.was_cli_mode = 1 AND tu.timestamp >= datetime('now', '-30 days')`,
    )
    .get() as { saved: number }).saved;

  return { today, week, month, total, cliSavedMonth };
}

export interface OperationBreakdownRow {
  operation_id: string;
  calls: number;
  total_input: number;
  total_output: number;
  total_cost: number;
}

export function getUsageByOperation(days = 30): OperationBreakdownRow[] {
  return getDb()
    .prepare(
      `SELECT operation_id,
              COUNT(*) as calls,
              SUM(input_tokens) as total_input,
              SUM(output_tokens) as total_output,
              SUM(cost_usd) as total_cost
       FROM token_usage
       WHERE operation_id IS NOT NULL AND timestamp >= datetime('now', ?)
       GROUP BY operation_id
       ORDER BY total_cost DESC`,
    )
    .all(`-${days} days`) as OperationBreakdownRow[];
}

export interface UsageByModelRow {
  target_id: string;
  calls: number;
  total_cost: number;
}

export function getUsageByModel(days = 30): UsageByModelRow[] {
  return getDb()
    .prepare(
      `SELECT target_id, COUNT(*) as calls, SUM(cost_usd) as total_cost
       FROM token_usage
       WHERE target_id IS NOT NULL AND timestamp >= datetime('now', ?)
       GROUP BY target_id
       ORDER BY total_cost DESC`,
    )
    .all(`-${days} days`) as UsageByModelRow[];
}

export interface TimeSeriesRow {
  day: string;
  total_cost: number;
  total_calls: number;
  total_tokens: number;
}

export function getUsageTimeseries(days = 30): TimeSeriesRow[] {
  return getDb()
    .prepare(
      `SELECT date(timestamp) as day,
              SUM(cost_usd) as total_cost,
              COUNT(*) as total_calls,
              SUM(input_tokens + output_tokens) as total_tokens
       FROM token_usage
       WHERE timestamp >= datetime('now', ?)
       GROUP BY day
       ORDER BY day`,
    )
    .all(`-${days} days`) as TimeSeriesRow[];
}
```

- [ ] **Step 2: Create `web-console/src/app/api/usage/summary/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getUsageSummary } from '@/lib/db/queries';

export async function GET() {
  return NextResponse.json(getUsageSummary());
}
```

- [ ] **Step 3: Create `web-console/src/app/api/usage/by-operation/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getUsageByOperation, getUsageByModel } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupBy = url.searchParams.get('group_by') ?? 'operation';
  const days = Number(url.searchParams.get('days') ?? '30');

  if (groupBy === 'model') {
    return NextResponse.json({ rows: getUsageByModel(days) });
  }
  return NextResponse.json({ rows: getUsageByOperation(days) });
}
```

- [ ] **Step 4: Create `web-console/src/app/api/usage/timeseries/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getUsageTimeseries } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') ?? '30');
  return NextResponse.json({ rows: getUsageTimeseries(days) });
}
```

- [ ] **Step 5: Create `web-console/src/app/api/presets/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { PRESETS } from '@/lib/ai/presets';

export async function GET() {
  return NextResponse.json({ presets: PRESETS });
}
```

- [ ] **Step 6: Create `web-console/src/app/api/presets/apply/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { applyPreset } from '@/lib/ai/presets';

export async function POST(request: Request) {
  const body = (await request.json()) as { preset_id?: string };
  if (!body.preset_id) {
    return NextResponse.json({ ok: false, error: 'preset_id required' }, { status: 400 });
  }
  try {
    applyPreset(body.preset_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 7: Create `web-console/src/app/api/targets/detect/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { listModelTargets, updateTargetAvailability } from '@/lib/db/queries';
import { getAdapter } from '@/lib/ai-providers/factory';
import { registerAllAdapters } from '@/lib/ai-providers/adapters';

/** POST /api/targets/detect — run availability detection on all targets */
export async function POST() {
  registerAllAdapters();
  const targets = listModelTargets();
  const results: Array<{ id: string; available: boolean; reason?: string }> = [];

  for (const target of targets) {
    try {
      const adapter = getAdapter(target.provider, target.mode);
      const result = await adapter.detectAvailability(target.id);
      updateTargetAvailability(target.id, result.available, result.reason ?? null);
      results.push({ id: target.id, available: result.available, reason: result.reason });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      updateTargetAvailability(target.id, false, reason);
      results.push({ id: target.id, available: false, reason });
    }
  }

  return NextResponse.json({ ok: true, results });
}
```

- [ ] **Step 8: Create `web-console/src/app/api/targets/refresh-pricing/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedModelTargets } from '@/lib/db/seed-model-targets';

/** POST /api/targets/refresh-pricing — re-run seed (respects price_manually_edited=1) */
export async function POST() {
  const count = seedModelTargets(getDb());
  return NextResponse.json({ ok: true, refreshed: count });
}
```

- [ ] **Step 9: Commit**

```bash
git add web-console/src/app/api/usage web-console/src/app/api/presets web-console/src/app/api/targets/detect web-console/src/app/api/targets/refresh-pricing web-console/src/lib/db/queries.ts
git commit -m "feat(api): usage/presets/targets-detect/refresh-pricing endpoints"
```

---

## Phase 1.G: Settings UI (Tasks 26-30)

### Task 26: Settings store (Zustand)

**Files:**
- Create: `web-console/src/stores/settings-store.ts`

- [ ] **Step 1: Create `web-console/src/stores/settings-store.ts`**

```ts
'use client';

import { create } from 'zustand';

// ── Types mirror API responses ────────────────────────────

export interface OperationView {
  id: string;
  category: string;
  displayName: string;
  description: string;
  recommendedTier: string | null;
  recommendedRationale: string | null;
  isEnabled: boolean;
  override: string | null;
  categoryDefault: string | null;
  effectiveTarget: {
    id: string;
    displayName: string;
    provider: string;
    mode: 'api' | 'cli';
  } | null;
  isOverridden: boolean;
}

export interface TargetView {
  id: string;
  modelId: string;
  provider: string;
  mode: 'api' | 'cli';
  displayName: string;
  description: string | null;
  inputPricePer1M: number | null;
  outputPricePer1M: number | null;
  cacheReadPricePer1M: number | null;
  contextWindow: number | null;
  tier: string | null;
  available: boolean;
  availabilityReason: string | null;
}

export interface BudgetView {
  id: number;
  daily_budget_usd: number;
  warn_threshold_pct: number;
  soft_block_threshold_pct: number;
  hard_block_threshold_pct: number;
  fallback_target_id: string | null;
}

interface SettingsState {
  operations: OperationView[];
  targets: TargetView[];
  budget: BudgetView | null;
  loading: boolean;
  error: string | null;
}

interface SettingsActions {
  loadAll: () => Promise<void>;
  setCategoryDefault: (category: string, targetId: string | null) => Promise<void>;
  setOverride: (operationId: string, targetId: string | null) => Promise<void>;
  setEnabled: (operationId: string, enabled: boolean) => Promise<void>;
  updateBudget: (patch: Partial<BudgetView>) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  detectAvailability: () => Promise<void>;
  refreshPricing: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  operations: [],
  targets: [],
  budget: null,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [opsRes, targetsRes, budgetRes] = await Promise.all([
        fetch('/api/operations'),
        fetch('/api/targets'),
        fetch('/api/budget'),
      ]);
      const ops = await opsRes.json();
      const targets = await targetsRes.json();
      const budget = await budgetRes.json();
      set({
        operations: ops.operations,
        targets: targets.targets,
        budget: budget.budget,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  setCategoryDefault: async (category, targetId) => {
    await fetch('/api/bindings/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, target_id: targetId }),
    });
    await get().loadAll();
  },

  setOverride: async (operationId, targetId) => {
    await fetch('/api/bindings/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_id: operationId, target_id: targetId }),
    });
    await get().loadAll();
  },

  setEnabled: async (operationId, enabled) => {
    await fetch(`/api/operations/${operationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    await get().loadAll();
  },

  updateBudget: async (patch) => {
    await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const res = await fetch('/api/budget');
    const data = await res.json();
    set({ budget: data.budget });
  },

  applyPreset: async (presetId) => {
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: presetId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to apply preset');
    }
    await get().loadAll();
  },

  detectAvailability: async () => {
    await fetch('/api/targets/detect', { method: 'POST' });
    await get().loadAll();
  },

  refreshPricing: async () => {
    await fetch('/api/targets/refresh-pricing', { method: 'POST' });
    await get().loadAll();
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add web-console/src/stores/settings-store.ts
git commit -m "feat(ui): settings-store with operations/targets/budget actions"
```

---

### Task 27: Settings page shell + operations tab

**Files:**
- Modify: `web-console/src/app/settings/page.tsx` (complete rewrite)
- Create: `web-console/src/components/settings/operations-tab.tsx`
- Create: `web-console/src/components/settings/operation-card.tsx`
- Create: `web-console/src/components/settings/model-select.tsx`

- [ ] **Step 1: Create `web-console/src/components/settings/model-select.tsx`**

```tsx
'use client';

import type { TargetView } from '@/stores/settings-store';

interface Props {
  targets: TargetView[];
  value: string | null;
  onChange: (targetId: string | null) => void;
  includeInherit?: boolean;
  inheritLabel?: string;
}

export default function ModelSelect({
  targets,
  value,
  onChange,
  includeInherit = false,
  inheritLabel = '继承类别默认',
}: Props) {
  const grouped = new Map<string, TargetView[]>();
  for (const t of targets) {
    const key = t.provider;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {includeInherit && <option value="">{inheritLabel}</option>}
      {Array.from(grouped.entries()).map(([provider, list]) => (
        <optgroup key={provider} label={provider}>
          {list.map((t) => {
            const tierBadge = t.tier === 'flagship' ? '★' : '';
            const modeBadge = t.mode === 'cli' ? ' [CLI]' : ' [API]';
            const priceLabel = t.mode === 'cli'
              ? '订阅制'
              : t.inputPricePer1M !== null
                ? `$${t.inputPricePer1M}/$${t.outputPricePer1M} per 1M`
                : '';
            return (
              <option key={t.id} value={t.id} disabled={!t.available}>
                {tierBadge} {t.displayName}{modeBadge} — {priceLabel}
                {!t.available ? ` (${t.availabilityReason ?? '不可用'})` : ''}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Create `web-console/src/components/settings/operation-card.tsx`**

```tsx
'use client';

import { useSettingsStore, type OperationView } from '@/stores/settings-store';
import ModelSelect from './model-select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  op: OperationView;
}

export default function OperationCard({ op }: Props) {
  const targets = useSettingsStore((s) => s.targets);
  const setOverride = useSettingsStore((s) => s.setOverride);
  const setEnabled = useSettingsStore((s) => s.setEnabled);

  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-stone-200 bg-white">
      {/* Enabled toggle */}
      <div className="pt-1 shrink-0">
        <Switch
          checked={op.isEnabled}
          onCheckedChange={(v) => setEnabled(op.id, v)}
          aria-label={`Toggle ${op.displayName}`}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{op.displayName}</span>
          <code className="text-xs text-stone-400 font-mono">{op.id}</code>
          {op.isOverridden && (
            <Badge variant="outline" className="text-xs">
              📌 已覆盖
            </Badge>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-2">{op.description}</p>
        {op.recommendedRationale && (
          <p className="text-xs text-amber-700 mb-2">💡 {op.recommendedRationale}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ModelSelect
              targets={targets}
              value={op.override}
              includeInherit={true}
              inheritLabel={
                op.categoryDefault
                  ? `继承类别 (${targets.find((t) => t.id === op.categoryDefault)?.displayName ?? op.categoryDefault})`
                  : '未配置 — 请设置类别默认或覆盖'
              }
              onChange={(targetId) => setOverride(op.id, targetId)}
            />
          </div>
          {op.isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverride(op.id, null)}
              className="text-xs shrink-0"
            >
              清除覆盖
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `web-console/src/components/settings/operations-tab.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSettingsStore, type OperationView } from '@/stores/settings-store';
import OperationCard from './operation-card';
import ModelSelect from './model-select';

const CATEGORY_LABELS: Record<string, string> = {
  project: '📁 项目初始化',
  lore: '📚 资料库',
  outline: '📋 大纲',
  showrunner: '🎬 制片人',
  writer: '✍️ 编剧室',
  review: '🔍 评审',
  context: '🧠 上下文',
};

export default function OperationsTab() {
  const operations = useSettingsStore((s) => s.operations);
  const targets = useSettingsStore((s) => s.targets);
  const setCategoryDefault = useSettingsStore((s) => s.setCategoryDefault);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, OperationView[]>();
    for (const op of operations) {
      if (!map.has(op.category)) map.set(op.category, []);
      map.get(op.category)!.push(op);
    }
    return Array.from(map.entries()).sort((a, b) =>
      (CATEGORY_LABELS[a[0]] ?? a[0]).localeCompare(CATEGORY_LABELS[b[0]] ?? b[0]),
    );
  }, [operations]);

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <div className="space-y-3">
      {grouped.map(([category, ops]) => {
        const isCollapsed = collapsed.has(category);
        const categoryDefault = ops[0]?.categoryDefault;
        return (
          <section key={category} className="rounded-lg border border-stone-200 bg-stone-50">
            {/* Category header */}
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => toggle(category)}
                className="flex items-center gap-1 font-medium text-sm"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                {CATEGORY_LABELS[category] ?? category}
                <span className="text-xs text-stone-400">({ops.length})</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-stone-500 shrink-0">类别默认:</span>
                <div className="w-80">
                  <ModelSelect
                    targets={targets}
                    value={categoryDefault ?? null}
                    includeInherit={true}
                    inheritLabel="— 未设置 —"
                    onChange={(t) => setCategoryDefault(category, t)}
                  />
                </div>
              </div>
            </div>

            {/* Operation list */}
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2">
                {ops.map((op) => (
                  <OperationCard key={op.id} op={op} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Overwrite `web-console/src/app/settings/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import OperationsTab from '@/components/settings/operations-tab';
import CredentialsTab from '@/components/settings/credentials-tab';
import BudgetTab from '@/components/settings/budget-tab';
import PresetModal from '@/components/settings/preset-modal';

export default function SettingsPage() {
  const loadAll = useSettingsStore((s) => s.loadAll);
  const loading = useSettingsStore((s) => s.loading);
  const error = useSettingsStore((s) => s.error);
  const [presetOpen, setPresetOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">设置</h2>
          <p className="mt-1 text-sm text-stone-500">AI 操作配置、凭证管理、预算告警</p>
        </div>
        <Button onClick={() => setPresetOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Sparkles className="size-4" />
          应用预设
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-stone-500">加载中...</div>}

      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">🎯 操作配置</TabsTrigger>
          <TabsTrigger value="credentials">🔑 凭证管理</TabsTrigger>
          <TabsTrigger value="budget">📊 预算与告警</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-4">
          <OperationsTab />
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          <CredentialsTab />
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          <BudgetTab />
        </TabsContent>
      </Tabs>

      <PresetModal open={presetOpen} onClose={() => setPresetOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web-console/src/app/settings/page.tsx web-console/src/components/settings/operations-tab.tsx web-console/src/components/settings/operation-card.tsx web-console/src/components/settings/model-select.tsx
git commit -m "feat(ui): settings page shell + operations tab"
```

---

### Task 28: Credentials + Budget tabs

**Files:**
- Create: `web-console/src/components/settings/credentials-tab.tsx`
- Create: `web-console/src/components/settings/budget-tab.tsx`

- [ ] **Step 1: Create `web-console/src/components/settings/credentials-tab.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

interface ProviderCred {
  provider: string;
  label: string;
  configKey: string;
}

const API_PROVIDERS: ProviderCred[] = [
  { provider: 'anthropic', label: 'Anthropic (Claude)', configKey: 'anthropic_api_key' },
  { provider: 'openai', label: 'OpenAI', configKey: 'openai_api_key' },
  { provider: 'google', label: 'Google (Gemini)', configKey: 'gemini_api_key' },
  { provider: 'deepseek', label: 'DeepSeek', configKey: 'deepseek_api_key' },
  { provider: 'alibaba', label: 'Alibaba (Qwen)', configKey: 'alibaba_api_key' },
  { provider: 'zhipu', label: 'Zhipu (GLM)', configKey: 'zhipu_api_key' },
  { provider: 'moonshot', label: 'Moonshot (Kimi)', configKey: 'moonshot_api_key' },
];

export default function CredentialsTab() {
  const detectAvailability = useSettingsStore((s) => s.detectAvailability);
  const refreshPricing = useSettingsStore((s) => s.refreshPricing);
  const targets = useSettingsStore((s) => s.targets);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        const row = data.data as Array<{ key: string; value: string }>;
        const map: Record<string, string> = {};
        for (const r of row) {
          if (r.key.endsWith('_api_key')) map[r.key] = r.value;
        }
        setKeys(map);
        setLoading(false);
      });
  }, []);

  async function saveKey(configKey: string, value: string) {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [configKey]: value }),
    });
    toast.success(`${configKey} 已保存`);
    await detectAvailability();
  }

  async function handleRefreshPricing() {
    await refreshPricing();
    toast.success('定价表已刷新');
  }

  async function handleDetect() {
    toast.info('开始检测...');
    await detectAvailability();
    toast.success('检测完成');
  }

  if (loading) return <div className="text-sm text-stone-500">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex gap-2">
        <Button onClick={handleDetect} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          重新检测可用性
        </Button>
        <Button onClick={handleRefreshPricing} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          刷新定价表
        </Button>
      </div>

      {/* API Providers */}
      <section>
        <h3 className="font-medium mb-3">🌐 API 凭证</h3>
        <div className="space-y-3">
          {API_PROVIDERS.map((p) => {
            const keyValue = keys[p.configKey] ?? '';
            const isShown = shown[p.configKey] ?? false;
            const providerTargets = targets.filter((t) => t.provider === p.provider && t.mode === 'api');
            const anyAvailable = providerTargets.some((t) => t.available);

            return (
              <div key={p.provider} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">{p.label}</Label>
                  {anyAvailable ? (
                    <Badge className="bg-green-100 text-green-700">✓ 已配置</Badge>
                  ) : (
                    <Badge variant="outline" className="text-stone-500">✗ 未配置</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type={isShown ? 'text' : 'password'}
                    value={keyValue === '••••••••' ? '' : keyValue}
                    placeholder={keyValue === '••••••••' ? '（已保存，输入新值覆盖）' : 'sk-...'}
                    onChange={(e) => setKeys({ ...keys, [p.configKey]: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setShown({ ...shown, [p.configKey]: !isShown })
                    }
                  >
                    {isShown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveKey(p.configKey, keyValue)}
                    disabled={!keyValue || keyValue === '••••••••'}
                  >
                    保存
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CLI Detection */}
      <section>
        <h3 className="font-medium mb-3">💻 CLI 检测</h3>
        <div className="space-y-3">
          {['claude', 'gemini'].map((cli) => {
            const cliTargets = targets.filter((t) => t.mode === 'cli' && t.provider === (cli === 'claude' ? 'anthropic' : 'google'));
            const available = cliTargets.some((t) => t.available);
            const reason = cliTargets.find((t) => !t.available)?.availabilityReason;
            return (
              <div key={cli} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">{cli} CLI</div>
                    {available ? (
                      <div className="text-xs text-green-600 mt-1">✓ 已检测到</div>
                    ) : (
                      <div className="text-xs text-stone-500 mt-1">{reason ?? '未检测到'}</div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDetect}>
                    重新检测
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `web-console/src/components/settings/budget-tab.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ModelSelect from './model-select';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

export default function BudgetTab() {
  const budget = useSettingsStore((s) => s.budget);
  const targets = useSettingsStore((s) => s.targets);
  const updateBudget = useSettingsStore((s) => s.updateBudget);

  const [daily, setDaily] = useState(0);
  const [warn, setWarn] = useState(80);
  const [soft, setSoft] = useState(100);
  const [hard, setHard] = useState(120);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setDaily(budget.daily_budget_usd);
      setWarn(budget.warn_threshold_pct);
      setSoft(budget.soft_block_threshold_pct);
      setHard(budget.hard_block_threshold_pct);
      setFallback(budget.fallback_target_id);
    }
  }, [budget]);

  async function handleSave() {
    await updateBudget({
      daily_budget_usd: daily,
      warn_threshold_pct: warn,
      soft_block_threshold_pct: soft,
      hard_block_threshold_pct: hard,
      fallback_target_id: fallback,
    });
    toast.success('预算配置已保存');
  }

  if (!budget) return <div className="text-sm text-stone-500">加载中...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h3 className="font-medium">每日预算上限</h3>
        <div className="space-y-1.5">
          <Label htmlFor="daily">USD / 天</Label>
          <Input
            id="daily"
            type="number"
            step="0.01"
            min={0}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
          <p className="text-xs text-stone-500">💡 设为 0 表示无限制</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">告警阈值</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>预警 %</Label>
            <Input type="number" min={0} max={200} value={warn} onChange={(e) => setWarn(Number(e.target.value))} />
            <p className="text-xs text-stone-500">📢 顶部 banner</p>
          </div>
          <div className="space-y-1.5">
            <Label>软阻 %</Label>
            <Input type="number" min={0} max={200} value={soft} onChange={(e) => setSoft(Number(e.target.value))} />
            <p className="text-xs text-stone-500">⚠️ 确认框</p>
          </div>
          <div className="space-y-1.5">
            <Label>硬阻 %</Label>
            <Input type="number" min={0} max={200} value={hard} onChange={(e) => setHard(Number(e.target.value))} />
            <p className="text-xs text-stone-500">⛔ 拒绝调用</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">快照兜底模型</h3>
        <p className="text-xs text-stone-500">
          AI 操作失败时，用此模型生成人类可读的失败摘要（可为空）
        </p>
        <ModelSelect
          targets={targets.filter((t) => t.mode === 'api')}
          value={fallback}
          includeInherit={true}
          inheritLabel="— 不使用 AI 分析 —"
          onChange={setFallback}
        />
      </section>

      <Button onClick={handleSave} className="gap-2">
        <Save className="size-4" />
        保存
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web-console/src/components/settings/credentials-tab.tsx web-console/src/components/settings/budget-tab.tsx
git commit -m "feat(ui): credentials and budget tabs"
```

---

### Task 29: Preset modal

**Files:**
- Create: `web-console/src/components/settings/preset-modal.tsx`

- [ ] **Step 1: Create `web-console/src/components/settings/preset-modal.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

interface Preset {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  estimatedCost100Chapters: string;
  requirements: string[];
  categoryDefaults: Record<string, string>;
  overrides: Record<string, string>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PresetModal({ open, onClose }: Props) {
  const applyPreset = useSettingsStore((s) => s.applyPreset);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/presets')
      .then((r) => r.json())
      .then((data) => setPresets(data.presets));
  }, [open]);

  if (!open) return null;

  async function handleApply(presetId: string) {
    try {
      await applyPreset(presetId);
      toast.success(`已应用预设: ${presets.find((p) => p.id === presetId)?.name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">选择预设配置</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {presets.map((p) => (
            <div key={p.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="text-sm text-stone-500 mt-1">{p.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{p.channelCount} 渠道</Badge>
                    <Badge variant="outline">{p.estimatedCost100Chapters}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
                    前置条件: {p.requirements.join(' / ')}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  <Button size="sm" onClick={() => handleApply(p.id)} className="gap-1.5">
                    <Check className="size-3.5" />
                    应用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    {expanded === p.id ? '收起' : '详情'}
                  </Button>
                </div>
              </div>

              {expanded === p.id && (
                <div className="mt-3 pt-3 border-t space-y-2 text-xs font-mono">
                  <div>
                    <strong className="text-stone-500">类别默认:</strong>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(p.categoryDefaults).map(([cat, t]) => (
                        <li key={cat}>
                          {cat} → {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {Object.keys(p.overrides).length > 0 && (
                    <div>
                      <strong className="text-stone-500">覆盖:</strong>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(p.overrides).map(([op, t]) => (
                          <li key={op}>
                            {op} → {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web-console/src/components/settings/preset-modal.tsx
git commit -m "feat(ui): preset modal with 6 preset options"
```

---

## Phase 1.H: Usage Page UI (Tasks 30-32)

### Task 30: Usage page shell + overview cards + budget bar

**Files:**
- Create: `web-console/src/app/usage/page.tsx`
- Create: `web-console/src/components/usage/overview-cards.tsx`
- Create: `web-console/src/components/usage/budget-bar.tsx`
- Modify: `web-console/src/components/layout/sidebar.tsx` (add link to /usage)

- [ ] **Step 1: Create `web-console/src/components/usage/overview-cards.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Summary {
  today: number;
  week: number;
  month: number;
  total: number;
  cliSavedMonth: number;
}

export default function OverviewCards() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch('/api/usage/summary')
      .then((r) => r.json())
      .then(setSummary);
  }, []);

  if (!summary) return <div className="text-sm text-stone-500">加载中...</div>;

  const cards = [
    { label: '今日', value: summary.today },
    { label: '本周', value: summary.week },
    { label: '本月', value: summary.month },
    { label: '累计', value: summary.total },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-1.5">
                <DollarSign className="size-3.5" />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold text-stone-800">
                ${c.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.cliSavedMonth > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <TrendingDown className="size-4" />
          💚 本月通过 CLI 模式节省:{' '}
          <strong>${summary.cliSavedMonth.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `web-console/src/components/usage/budget-bar.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';

interface State {
  level: 'ok' | 'warn' | 'soft_block' | 'hard_block';
  pct?: number;
  budget?: number;
  todayCost?: number;
}

export default function BudgetBar() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('/api/budget/check?operation_id=writer.main')
        .then((r) => r.json())
        .then(setState);
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (!state || state.level === 'ok' || !state.pct) return null;

  const pct = Math.min(150, state.pct);
  const fillWidth = Math.min(100, pct);
  const color =
    state.level === 'hard_block'
      ? 'bg-red-500'
      : state.level === 'soft_block'
        ? 'bg-orange-500'
        : 'bg-yellow-400';

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-medium">今日预算使用</span>
        <span>
          ${state.todayCost?.toFixed(2)} / ${state.budget?.toFixed(2)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-stone-200 overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${fillWidth}%` }} />
        {/* Threshold markers */}
        <div className="absolute top-0 left-[80%] h-full w-0.5 bg-stone-500 opacity-30" />
        <div className="absolute top-0 left-[100%] h-full w-0.5 bg-stone-500 opacity-50" />
      </div>
      <div className="flex justify-between mt-1 text-xs text-stone-400">
        <span>[预警 80%]</span>
        <span>[软阻 100%]</span>
        <span>[硬阻 120%]</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `web-console/src/app/usage/page.tsx`**

```tsx
'use client';

import OverviewCards from '@/components/usage/overview-cards';
import BudgetBar from '@/components/usage/budget-bar';
import OperationBreakdown from '@/components/usage/operation-breakdown';
import TimeSeriesChart from '@/components/usage/time-series-chart';
import SnapshotsTable from '@/components/usage/snapshots-table';
import PerOpEstimate from '@/components/usage/per-op-estimate';

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800">用量监控</h2>
        <p className="mt-1 text-sm text-stone-500">AI 调用成本、按操作拆分、失败快照</p>
      </div>

      <OverviewCards />
      <BudgetBar />
      <OperationBreakdown />
      <TimeSeriesChart />
      <PerOpEstimate />
      <SnapshotsTable />
    </div>
  );
}
```

- [ ] **Step 4: Add `/usage` link to sidebar**

In `web-console/src/components/layout/sidebar.tsx`, find the system navigation group and add an entry for `/usage`:

```tsx
{ href: '/usage', label: '用量监控', icon: DollarSign },
```

Import `DollarSign` from `lucide-react` at the top of the file.

- [ ] **Step 5: Commit**

```bash
git add web-console/src/app/usage web-console/src/components/usage/overview-cards.tsx web-console/src/components/usage/budget-bar.tsx web-console/src/components/layout/sidebar.tsx
git commit -m "feat(ui): usage page shell + overview + budget bar + sidebar link"
```

---

### Task 31: Operation breakdown table + time series chart

**Files:**
- Create: `web-console/src/components/usage/operation-breakdown.tsx`
- Create: `web-console/src/components/usage/time-series-chart.tsx`

- [ ] **Step 1: Create `web-console/src/components/usage/operation-breakdown.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row {
  operation_id?: string;
  target_id?: string;
  calls: number;
  total_input?: number;
  total_output?: number;
  total_cost: number;
}

type GroupBy = 'operation' | 'model';

export default function OperationBreakdown() {
  const [groupBy, setGroupBy] = useState<GroupBy>('operation');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/usage/by-operation?group_by=${groupBy}`)
      .then((r) => r.json())
      .then((data) => setRows(data.rows));
  }, [groupBy]);

  const total = rows.reduce((sum, r) => sum + r.total_cost, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">按{groupBy === 'operation' ? '操作' : '模型'}拆分</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('operation')}
              className={`text-xs px-2 py-1 rounded ${groupBy === 'operation' ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`}
            >
              按操作
            </button>
            <button
              onClick={() => setGroupBy('model')}
              className={`text-xs px-2 py-1 rounded ${groupBy === 'model' ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`}
            >
              按模型
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">暂无数据</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-500">
                <th className="text-left pb-2">{groupBy === 'operation' ? 'Operation' : 'Model'}</th>
                <th className="text-right pb-2">调用</th>
                <th className="text-right pb-2">成本</th>
                <th className="text-right pb-2">占比</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 font-mono text-xs">
                    {r.operation_id ?? r.target_id}
                  </td>
                  <td className="py-2 text-right">{r.calls}</td>
                  <td className="py-2 text-right">${r.total_cost.toFixed(4)}</td>
                  <td className="py-2 text-right text-stone-500">
                    {total > 0 ? ((r.total_cost / total) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `web-console/src/components/usage/time-series-chart.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row {
  day: string;
  total_cost: number;
  total_calls: number;
  total_tokens: number;
}

type Metric = 'cost' | 'tokens' | 'calls';

export default function TimeSeriesChart() {
  const [metric, setMetric] = useState<Metric>('cost');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch('/api/usage/timeseries?days=30')
      .then((r) => r.json())
      .then((data) => setRows(data.rows));
  }, []);

  const max = Math.max(
    ...rows.map((r) =>
      metric === 'cost' ? r.total_cost : metric === 'tokens' ? r.total_tokens : r.total_calls,
    ),
    1,
  );

  const getValue = (r: Row) =>
    metric === 'cost' ? r.total_cost : metric === 'tokens' ? r.total_tokens : r.total_calls;

  const format = (v: number) =>
    metric === 'cost' ? `$${v.toFixed(2)}` : metric === 'tokens' ? `${(v / 1000).toFixed(1)}k` : String(v);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">时间趋势（最近 30 天）</CardTitle>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="text-xs px-2 py-1 rounded border border-stone-200"
          >
            <option value="cost">成本</option>
            <option value="tokens">Tokens</option>
            <option value="calls">调用数</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">暂无数据</p>
        ) : (
          <div className="h-40 flex items-end gap-1">
            {rows.map((r) => {
              const value = getValue(r);
              const h = (value / max) * 100;
              return (
                <div
                  key={r.day}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 rounded-t relative group"
                  style={{ height: `${h}%`, minHeight: '2px' }}
                  title={`${r.day}: ${format(value)}`}
                >
                  <div className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-stone-800 text-white px-1.5 py-0.5 rounded">
                    {format(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web-console/src/components/usage/operation-breakdown.tsx web-console/src/components/usage/time-series-chart.tsx
git commit -m "feat(ui): operation breakdown table + timeseries chart"
```

---

### Task 32: Snapshots table + per-op estimate

**Files:**
- Create: `web-console/src/components/usage/snapshots-table.tsx`
- Create: `web-console/src/components/usage/per-op-estimate.tsx`

- [ ] **Step 1: Create `web-console/src/components/usage/snapshots-table.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Snapshot {
  id: string;
  timestamp: string;
  operation_id: string;
  attempted_target_id: string;
  failure_category: string;
  failure_message: string;
  ai_summary: string | null;
  resume_hint: string | null;
  status: string;
}

export default function SnapshotsTable() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  async function load() {
    const res = await fetch('/api/snapshots?status=pending');
    const data = await res.json();
    setSnapshots(data.snapshots);
  }

  useEffect(() => {
    load();
  }, []);

  async function resume(id: string) {
    try {
      const res = await fetch(`/api/snapshots/${id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success('恢复成功');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function abandon(id: string) {
    await fetch(`/api/snapshots/${id}/abandon`, { method: 'POST' });
    toast.info('已放弃');
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">失败与快照</CardTitle>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">没有待处理的快照 🎉</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="rounded-md border border-stone-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-stone-500">
                        {s.operation_id}
                      </code>
                      <Badge
                        variant="outline"
                        className={
                          s.failure_category === 'transient'
                            ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                            : s.failure_category === 'permanent'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-stone-200 bg-stone-50'
                        }
                      >
                        {s.failure_category}
                      </Badge>
                    </div>
                    <div className="text-xs text-stone-500 mb-1">
                      {new Date(s.timestamp).toLocaleString('zh-CN')}
                      {' · '}
                      {s.attempted_target_id}
                    </div>
                    <div className="text-xs text-stone-700 line-clamp-2">
                      {s.failure_message}
                    </div>
                    {s.ai_summary && (
                      <div className="mt-1 text-xs text-blue-700 italic">
                        💡 {s.ai_summary}
                      </div>
                    )}
                    {s.resume_hint && (
                      <div className="mt-1 text-xs text-green-700">
                        🎯 {s.resume_hint}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => resume(s.id)} className="gap-1">
                      <RotateCw className="size-3" />
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abandon(s.id)}
                      className="gap-1 text-red-500"
                    >
                      <Trash2 className="size-3" />
                      放弃
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `web-console/src/components/usage/per-op-estimate.tsx`**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Static estimate table based on typical chapter writing usage
const ESTIMATES: Array<{ label: string; approxCost: string }> = [
  { label: '写完一整章（全流水）', approxCost: '≈ $0.19' },
  { label: 'writer.main', approxCost: '≈ $0.02' },
  { label: 'writer.architect', approxCost: '≈ $0.06' },
  { label: 'writer.final_revise', approxCost: '≈ $0.08' },
  { label: 'project.brainstorm（一次）', approxCost: '≈ $0.30' },
  { label: 'outline.volume.plan（一卷）', approxCost: '≈ $0.50' },
  { label: 'context.l0.refresh', approxCost: '≈ $0.005' },
];

export default function PerOpEstimate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">每 Operation 估价参考</CardTitle>
        <p className="text-xs text-stone-500 mt-1">
          基于推荐配置（Opus/Sonnet/DeepSeek 混合）的典型单次调用成本
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {ESTIMATES.map((e) => (
            <div
              key={e.label}
              className="flex items-center justify-between px-3 py-2 rounded border border-stone-200"
            >
              <span className="text-stone-700">{e.label}</span>
              <span className="font-mono text-amber-700">{e.approxCost}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web-console/src/components/usage/snapshots-table.tsx web-console/src/components/usage/per-op-estimate.tsx
git commit -m "feat(ui): snapshots table + per-operation estimate card"
```

---

## Phase 1.I: Migration & Integration (Tasks 33-35)

### Task 33: agents.yaml migration script

**Files:**
- Create: `scripts/migrate-to-operations.ts`
- Create: `scripts/migrate-to-operations.test.ts`

- [ ] **Step 1: Create `scripts/migrate-to-operations.ts`**

```ts
/**
 * One-time migration script: rewrite config/agents.yaml to use operation_id
 * instead of the deprecated model field.
 *
 * Run: tsx scripts/migrate-to-operations.ts
 */
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENTS_YAML = path.join(PROJECT_ROOT, 'config', 'agents.yaml');
const BACKUP = `${AGENTS_YAML}.bak`;

/** Map current role names to operation IDs */
const ROLE_TO_OPERATION: Record<string, string> = {
  architect: 'writer.architect',
  main_writer: 'writer.main',
  character_advocate: 'writer.character_advocate',
  atmosphere: 'writer.atmosphere',
  foreshadow_weaver: 'writer.foreshadow_weaver',
  revise: 'writer.revise',
  final_revise: 'writer.final_revise',
  critic: 'critic.review',
  continuity: 'continuity.check',
  showrunner: 'showrunner.decide',
};

interface AgentsYaml {
  roles: Record<
    string,
    {
      prompt_file: string;
      model?: string;
      operation_id?: string;
      [k: string]: unknown;
    }
  >;
  [k: string]: unknown;
}

async function main() {
  // Check if file exists
  try {
    await access(AGENTS_YAML);
  } catch {
    console.error(`File not found: ${AGENTS_YAML}`);
    process.exit(1);
  }

  // Backup
  await copyFile(AGENTS_YAML, BACKUP);
  console.log(`✓ Backup saved to ${BACKUP}`);

  // Read and parse
  const raw = await readFile(AGENTS_YAML, 'utf8');
  const data = yaml.load(raw) as AgentsYaml;

  if (!data.roles) {
    console.error('No "roles" key in agents.yaml');
    process.exit(1);
  }

  // Migrate each role
  let migratedCount = 0;
  for (const [roleName, role] of Object.entries(data.roles)) {
    if (role.operation_id) {
      console.log(`  - ${roleName}: already has operation_id (${role.operation_id})`);
      continue;
    }
    const opId = ROLE_TO_OPERATION[roleName];
    if (!opId) {
      console.warn(`  ⚠ ${roleName}: no operation mapping, skipping`);
      continue;
    }
    role.operation_id = opId;
    delete role.model;
    console.log(`  ✓ ${roleName} → ${opId}`);
    migratedCount++;
  }

  // Write back
  const newYaml = yaml.dump(data, { lineWidth: 120, indent: 2 });
  await writeFile(AGENTS_YAML, `# 由 migrate-to-operations.ts 自动迁移\n${newYaml}`);
  console.log(`\n✓ Migrated ${migratedCount} roles`);
  console.log(`✓ Updated ${AGENTS_YAML}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run migration on current repo**

```bash
cd D:/codeProgram/novelforge/novelforge
pnpm --filter web-console exec tsx scripts/migrate-to-operations.ts
```
Expected output: lists migrated roles, creates `config/agents.yaml.bak`.

- [ ] **Step 3: Verify new agents.yaml**

```bash
cat config/agents.yaml | head -30
```
Expected: see `operation_id:` fields instead of `model:`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-to-operations.ts config/agents.yaml config/agents.yaml.bak
git commit -m "feat(scripts): migrate agents.yaml from model to operation_id"
```

---

### Task 34: Shell script integration + availability scan on startup

**Files:**
- Modify: `scripts/writers-room.sh`
- Modify: `remote-agent/src/index.ts` (trigger detect on startup)

- [ ] **Step 1: Update `scripts/writers-room.sh` to use `/api/operation/run`**

Find the section that spawns CLI directly and replace with:

```bash
# ── Call operation via Web API (unified entry) ──
# Requires Web console running at $WEB_URL (default http://localhost:3000)
WEB_URL="${WEB_URL:-http://localhost:3000}"

call_operation() {
  local op_id="$1"
  local prompt_file="$2"
  local system_prompt
  system_prompt=$(cat "$prompt_file")

  local response
  response=$(curl -sS -X POST "${WEB_URL}/api/operation/run" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg op "$op_id" \
      --arg sys "$system_prompt" \
      --arg usr "Generate content based on the system prompt" \
      '{operation_id: $op, system_prompt: $sys, messages: [{role: "user", content: $usr}]}')")

  local ok
  ok=$(echo "$response" | jq -r '.ok')
  if [ "$ok" != "true" ]; then
    echo "Operation $op_id failed:" >&2
    echo "$response" | jq '.error' >&2
    return 1
  fi

  echo "$response" | jq -r '.content'
}
```

Then replace calls to `$CLAUDE_CMD -p ...` with `call_operation "writer.architect" "$PROMPT_FILE"`.

> If `writers-room.sh` has multiple spawn sites for different roles, apply the same `call_operation "$op_id" "$prompt_file"` pattern to each one. Map each role to its operation_id using the table in Task 33's `ROLE_TO_OPERATION` constant.

- [ ] **Step 2: Add startup detection call in `remote-agent/src/index.ts`**

At the end of `httpServer.listen(...)` callback, add:

```ts
// Trigger target availability detection after startup
fetch(`http://localhost:3000/api/targets/detect`, { method: 'POST' })
  .then(() => console.log('[启动] 已触发 target 可用性检测'))
  .catch((err) => console.warn('[启动] 可用性检测失败（Web 尚未就绪）:', err.message));
```

Note: This call is fire-and-forget — if Web console isn't running yet, it just logs the error.

- [ ] **Step 3: Commit**

```bash
git add scripts/writers-room.sh remote-agent/src/index.ts
git commit -m "feat: shell + agent integration with unified operation API"
```

---

### Task 35: End-to-end smoke test + STATUS.md update

**Files:**
- Create: `web-console/src/__tests__/e2e-smoke.test.ts`
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Create `web-console/src/__tests__/e2e-smoke.test.ts`**

```ts
/**
 * End-to-end smoke test: seed DB → apply preset → simulate operation call → verify usage recorded
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import { __clearAdapters, registerAdapter } from '@/lib/ai-providers/factory';
import type { ProviderAdapter } from '@/lib/ai-providers/types';

describe('E2E smoke: preset → run → usage', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    __clearAdapters();

    // Mock DeepSeek adapter
    registerAdapter({
      id: 'mock-openai-compat',
      mode: 'api',
      supportedProviders: ['deepseek'],
      async detectAvailability() {
        return { available: true };
      },
      async execute(params) {
        return {
          content: `mock response for ${params.operationId}`,
          usage: {
            inputTokens: 1000,
            outputTokens: 500,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          costUsd: 0.00049, // DeepSeek: 1000*0.28/M + 500*0.42/M
          wasCliMode: false,
          finishReason: 'stop',
        };
      },
      async *stream() {
        yield { type: 'done' };
      },
    });
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('applies budget preset and runs an operation successfully', async () => {
    // Step 1: apply budget preset
    const { applyPreset } = await import('@/lib/ai/presets');
    applyPreset('budget');

    // Step 2: run writer.main
    const { runOperation } = await import('@/lib/ai/run-operation');
    const result = await runOperation('writer.main', {
      messages: [{ role: 'user', content: 'write chapter 1' }],
    });

    expect(result.content).toContain('writer.main');
    expect(result.wasCliMode).toBe(false);
    expect(result.costUsd).toBeCloseTo(0.00049, 5);

    // Step 3: verify usage recorded
    const { getUsageSummary } = await import('@/lib/db/queries');
    const summary = getUsageSummary();
    expect(summary.today).toBeCloseTo(0.00049, 5);

    // Step 4: verify operation breakdown
    const { getUsageByOperation } = await import('@/lib/db/queries');
    const breakdown = getUsageByOperation();
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].operation_id).toBe('writer.main');
    expect(breakdown[0].calls).toBe(1);
  });

  it('runs 5 operations and aggregates correctly', async () => {
    const { applyPreset } = await import('@/lib/ai/presets');
    applyPreset('budget');

    const { runOperation } = await import('@/lib/ai/run-operation');
    for (let i = 0; i < 5; i++) {
      await runOperation('writer.main', {
        messages: [{ role: 'user', content: `iter ${i}` }],
      });
    }

    const { getUsageSummary, getUsageByOperation } = await import('@/lib/db/queries');
    const summary = getUsageSummary();
    expect(summary.today).toBeCloseTo(0.00049 * 5, 5);

    const breakdown = getUsageByOperation();
    expect(breakdown[0].calls).toBe(5);
  });
});
```

- [ ] **Step 2: Run E2E smoke test**

```bash
cd web-console && pnpm test e2e-smoke
```
Expected: 2 passed.

- [ ] **Step 3: Run FULL test suite**

```bash
cd web-console && pnpm test
```
Expected: all tests passing.

- [ ] **Step 4: Update `docs/STATUS.md`**

Change the model configuration row from `60%` to `100%`:

```md
| 模型配置 | 100% | ✅ 19 operation + 6 预设 + 8 provider 适配层 |
```

Change usage monitoring row from `40%` to `100%`:

```md
| 用量监控 | 100% | ✅ 成本计算 + 预算告警 + dashboard + 失败快照 |
```

- [ ] **Step 5: Commit**

```bash
git add web-console/src/__tests__/e2e-smoke.test.ts docs/STATUS.md
git commit -m "test: E2E smoke test for Feature 1 + STATUS update"
```

- [ ] **Step 6: Push to remote**

```bash
git push origin main
```

---

## Summary

**Total Tasks:** 35
**Estimated Files:** ~60 created/modified
**Test Coverage Targets:** ≥90% for `lib/ai/`, `lib/ai-providers/`, `lib/db/`
**Commit Cadence:** 35 commits (one per task)

### Phase Breakdown
- **1.A Foundation** (Tasks 1-8): vitest, pricing, schema, seeds, queries, errors
- **1.B Core Logic** (Tasks 9-13): types, resolve, budget, factory, snapshots
- **1.C Adapters** (Tasks 14-18): Anthropic API, OpenAI-compat, Gemini API, Claude CLI, Gemini CLI
- **1.D Execution** (Tasks 19-20): runOperation, resume
- **1.E Presets** (Task 21): 6 preset definitions + applyPreset
- **1.F API Routes** (Tasks 22-25): 15+ endpoints
- **1.G Settings UI** (Tasks 26-29): store, operations tab, credentials, budget, preset modal
- **1.H Usage UI** (Tasks 30-32): overview, breakdown, timeseries, snapshots, estimates
- **1.I Integration** (Tasks 33-35): migration, shell scripts, E2E smoke

### Post-Implementation
After all tasks complete, run manual E2E:
1. Open `/settings`, apply "极致性价比" preset
2. Enter DeepSeek API key in credentials tab
3. Click "重新检测可用性" → verify DeepSeek targets are green
4. Set daily budget to $1 in budget tab
5. Open `/usage` → should show $0 today
6. Trigger a test operation via `curl -X POST localhost:3000/api/operation/run -d '{...}'`
7. Refresh `/usage` → see cost increment
8. Simulate a 429 error (block DeepSeek API temporarily) → verify snapshot appears in /usage
9. Unblock + click 恢复 on snapshot → verify operation succeeds

Feature 1 done when all tasks committed, all tests passing, manual E2E succeeds.
