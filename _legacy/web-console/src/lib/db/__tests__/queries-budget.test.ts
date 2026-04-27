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
