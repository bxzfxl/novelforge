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
