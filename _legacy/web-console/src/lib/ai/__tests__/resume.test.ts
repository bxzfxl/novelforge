import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';
import { registerAdapter, __clearAdapters } from '@/lib/ai-providers/factory';
import type { ProviderAdapter } from '@/lib/ai-providers/types';
import { ProviderAPIError } from '@/lib/ai-providers/errors';

const SNAPSHOT_DIR = path.join(tmpdir(), `nf-snap-resume-${process.pid}-${Date.now()}`);
process.env.NOVELFORGE_SNAPSHOT_DIR = SNAPSHOT_DIR;

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

    // 首次调用失败，第二次成功的适配器
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

    // 第一次调用失败，创建快照
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

    // 用户更改配置：将 writer.main 覆盖为 sonnet
    setOperationOverride('writer.main', 'claude-sonnet-4-6:api');

    // 恢复执行
    const { resumeSnapshot } = await import('../resume');
    const result = await resumeSnapshot(snapshotId);

    expect(result.content).toContain('claude-sonnet-4-6:api');

    // 验证快照已标记为 resumed
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
