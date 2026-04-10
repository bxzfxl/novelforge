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
