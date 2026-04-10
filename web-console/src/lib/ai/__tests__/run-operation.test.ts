import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
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

const SNAPSHOT_DIR = path.resolve(process.cwd(), '..', 'workspace', 'snapshots');

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

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    seedOperations(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    __clearAdapters();
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

  it('happy path: runs, records usage, returns result', async () => {
    const { setCategoryDefault } = await import('@/lib/db/queries');
    setCategoryDefault('writer', 'claude-sonnet-4-6:api');

    registerAdapter(makeAdapter(['anthropic'], 'api', {}));

    const { runOperation } = await import('../run-operation');
    const result = await runOperation('writer.main', {
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.content).toBe('ok');

    // 验证 token_usage 行已写入
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

    // 未分发，不应创建快照
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
