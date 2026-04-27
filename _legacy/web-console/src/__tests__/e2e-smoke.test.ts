/**
 * End-to-end smoke test: 种子 DB → 应用预设 → 执行操作 → 验证用量记录
 *
 * 不启动 HTTP server，直接调用函数级接口验证全链路：
 * preset → runOperation → DB 写入 → usage 查询
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import { __clearAdapters, registerAdapter } from '@/lib/ai-providers/factory';
import type { ProviderAdapter } from '@/lib/ai-providers/types';

// 使用独立快照目录避免与其他测试冲突
const SNAPSHOT_DIR = path.join(tmpdir(), `nf-snap-e2e-${process.pid}-${Date.now()}`);
process.env.NOVELFORGE_SNAPSHOT_DIR = SNAPSHOT_DIR;

/** 构造 mock DeepSeek 适配器 */
function makeMockDeepSeekAdapter(): ProviderAdapter {
  return {
    id: 'mock-deepseek-api',
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
        costUsd: 0.00049, // DeepSeek V3: 1000*0.28/M + 500*0.42/M
        wasCliMode: false,
        finishReason: 'stop' as const,
      };
    },
    async *stream() {
      yield { type: 'done' as const };
    },
  };
}

describe('E2E smoke: preset → runOperation → usage', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    __clearAdapters();
    registerAdapter(makeMockDeepSeekAdapter());
    await mkdir(SNAPSHOT_DIR, { recursive: true });
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    try {
      await rm(SNAPSHOT_DIR, { recursive: true, force: true });
    } catch {
      // 清理失败时静默忽略
    }
  });

  it('应用 budget 预设后可成功执行 writer.main 并记录用量', async () => {
    // Step 1: 应用极致性价比预设（全部路由到 deepseek-chat:api）
    const { applyPreset } = await import('@/lib/ai/presets');
    applyPreset('budget');

    // Step 2: 执行 writer.main 操作
    const { runOperation } = await import('@/lib/ai/run-operation');
    const result = await runOperation('writer.main', {
      messages: [{ role: 'user', content: 'write chapter 1' }],
    });

    // 验证操作结果
    expect(result.content).toContain('writer.main');
    expect(result.wasCliMode).toBe(false);
    expect(result.costUsd).toBeCloseTo(0.00049, 5);

    // Step 3: 验证用量已写入 DB
    const { getUsageSummary } = await import('@/lib/db/queries');
    const summary = getUsageSummary();
    expect(summary.today).toBeCloseTo(0.00049, 5);

    // Step 4: 验证操作拆分视图
    const { getUsageByOperation } = await import('@/lib/db/queries');
    const breakdown = getUsageByOperation();
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].operation_id).toBe('writer.main');
    expect(breakdown[0].calls).toBe(1);
  });

  it('连续执行 5 次后成本正确累计', async () => {
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
    expect(breakdown[0].operation_id).toBe('writer.main');
    expect(breakdown[0].calls).toBe(5);
  });
});
