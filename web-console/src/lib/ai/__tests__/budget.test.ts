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
    getBudgetConfig(); // 初始化默认行
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
