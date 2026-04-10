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
    // 清理测试快照文件
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
    // 默认 attemptFallbackAnalysis 抛出 — 快照创建仍应成功，ai_summary 为 null
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
