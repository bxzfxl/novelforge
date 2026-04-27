import type Database from 'better-sqlite3';
import { PRICING_TABLE } from '@/lib/ai/pricing';

/**
 * Seed model_targets table from pricing constants.
 * Idempotent: uses INSERT OR REPLACE, but respects price_manually_edited=1 rows.
 */
export function seedModelTargets(db: Database.Database): number {
  const insert = db.prepare(`
    INSERT INTO model_targets (
      id, model_id, provider, mode, display_name, description,
      input_price_per_1m, output_price_per_1m, cache_read_price_per_1m,
      cache_write_5m_price_per_1m, cache_write_1h_price_per_1m,
      context_window, max_output_tokens, tier, available, price_manually_edited
    ) VALUES (
      @targetId, @modelId, @provider, @mode, @displayName, @description,
      @inputPricePer1M, @outputPricePer1M, @cacheReadPricePer1M,
      @cacheWrite5mPricePer1M, @cacheWrite1hPricePer1M,
      @contextWindow, @maxOutputTokens, @tier, 0, 0
    )
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      description = excluded.description,
      context_window = excluded.context_window,
      max_output_tokens = excluded.max_output_tokens,
      tier = excluded.tier,
      updated_at = datetime('now')
    WHERE price_manually_edited = 0
  `);

  const refreshPrices = db.prepare(`
    UPDATE model_targets SET
      input_price_per_1m = @inputPricePer1M,
      output_price_per_1m = @outputPricePer1M,
      cache_read_price_per_1m = @cacheReadPricePer1M,
      cache_write_5m_price_per_1m = @cacheWrite5mPricePer1M,
      cache_write_1h_price_per_1m = @cacheWrite1hPricePer1M,
      updated_at = datetime('now')
    WHERE id = @targetId AND price_manually_edited = 0
  `);

  let count = 0;
  const txn = db.transaction(() => {
    for (const entry of PRICING_TABLE) {
      insert.run(entry);
      refreshPrices.run(entry);
      count++;
    }
  });
  txn();

  return count;
}
