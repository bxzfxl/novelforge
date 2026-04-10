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
