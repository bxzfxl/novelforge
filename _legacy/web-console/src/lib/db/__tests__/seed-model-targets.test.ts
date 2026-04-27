import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '../schema';
import { seedModelTargets } from '../seed-model-targets';
import { PRICING_TABLE } from '@/lib/ai/pricing';

describe('seedModelTargets', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
  });

  afterEach(() => db.close());

  it('inserts all pricing entries', () => {
    const count = seedModelTargets(db);
    expect(count).toBe(PRICING_TABLE.length);

    const rows = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };
    expect(rows.n).toBe(PRICING_TABLE.length);
  });

  it('is idempotent on re-seed', () => {
    seedModelTargets(db);
    const first = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };

    seedModelTargets(db);
    const second = db.prepare('SELECT COUNT(*) as n FROM model_targets').get() as { n: number };

    expect(first.n).toBe(second.n);
  });

  it('preserves manually edited prices', () => {
    seedModelTargets(db);
    // Manually edit DeepSeek price
    db.prepare(
      `UPDATE model_targets SET input_price_per_1m = 99.99, price_manually_edited = 1 WHERE id = 'deepseek-chat:api'`,
    ).run();

    // Re-seed
    seedModelTargets(db);

    const row = db
      .prepare(`SELECT input_price_per_1m FROM model_targets WHERE id = 'deepseek-chat:api'`)
      .get() as { input_price_per_1m: number };
    expect(row.input_price_per_1m).toBe(99.99);
  });

  it('seeds both CLI and API modes', () => {
    seedModelTargets(db);
    const apis = db
      .prepare(`SELECT COUNT(*) as n FROM model_targets WHERE mode = 'api'`)
      .get() as { n: number };
    const clis = db
      .prepare(`SELECT COUNT(*) as n FROM model_targets WHERE mode = 'cli'`)
      .get() as { n: number };
    expect(apis.n).toBeGreaterThan(0);
    expect(clis.n).toBeGreaterThan(0);
  });
});
