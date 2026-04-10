import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';

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
    db.exec(SCHEMA);

    expect(() => {
      db.prepare(
        `INSERT INTO model_targets (id, model_id, provider, mode, display_name)
         VALUES ('test', 'test', 'anthropic', 'invalid-mode', 'Test')`,
      ).run();
    }).toThrow();
  });

  it('enforces budget_config single-row constraint', () => {
    db.exec(SCHEMA);

    db.prepare('INSERT INTO budget_config (id, daily_budget_usd) VALUES (1, 5.0)').run();
    expect(() => {
      db.prepare('INSERT INTO budget_config (id, daily_budget_usd) VALUES (2, 10.0)').run();
    }).toThrow();
  });
});
