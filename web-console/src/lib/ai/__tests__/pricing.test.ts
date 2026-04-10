import { describe, it, expect } from 'vitest';
import { PRICING_TABLE, computeCost, getPricingEntry } from '../pricing';

describe('pricing table', () => {
  it('has unique target IDs', () => {
    const ids = PRICING_TABLE.map((e) => e.targetId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('CLI entries have null pricing', () => {
    const cliEntries = PRICING_TABLE.filter((e) => e.mode === 'cli');
    expect(cliEntries.length).toBeGreaterThan(0);
    for (const e of cliEntries) {
      expect(e.inputPricePer1M).toBeNull();
      expect(e.outputPricePer1M).toBeNull();
    }
  });

  it('API entries have non-null pricing', () => {
    const apiEntries = PRICING_TABLE.filter((e) => e.mode === 'api');
    expect(apiEntries.length).toBeGreaterThan(0);
    for (const e of apiEntries) {
      expect(e.inputPricePer1M).not.toBeNull();
      expect(e.outputPricePer1M).not.toBeNull();
    }
  });
});

describe('computeCost', () => {
  const sonnet = getPricingEntry('claude-sonnet-4-6:api')!;

  it('calculates basic cost correctly', () => {
    // 1000 input @ $3/M + 500 output @ $15/M = $0.003 + $0.0075 = $0.0105
    const cost = computeCost(sonnet, { inputTokens: 1000, outputTokens: 500 });
    expect(cost).toBeCloseTo(0.0105, 4);
  });

  it('subtracts cache reads from input cost', () => {
    // 1000 input, 600 of which are cache reads
    // Non-cached: 400 * $3/M = $0.0012
    // Cache read: 600 * $0.30/M = $0.00018
    // Output: 0
    const cost = computeCost(sonnet, {
      inputTokens: 1000,
      outputTokens: 0,
      cacheReadTokens: 600,
    });
    expect(cost).toBeCloseTo(0.0012 + 0.00018, 5);
  });

  it('returns 0 for CLI entries', () => {
    const opusCli = getPricingEntry('claude-opus-4-6:cli')!;
    const cost = computeCost(opusCli, { inputTokens: 10000, outputTokens: 5000 });
    expect(cost).toBe(0);
  });

  it('handles DeepSeek extra-cheap pricing', () => {
    const deepseek = getPricingEntry('deepseek-chat:api')!;
    // 10000 input @ $0.28/M + 5000 output @ $0.42/M
    const cost = computeCost(deepseek, { inputTokens: 10000, outputTokens: 5000 });
    expect(cost).toBeCloseTo(0.0028 + 0.0021, 5);
  });
});

describe('getPricingEntry', () => {
  it('finds claude-opus-4-6:api', () => {
    const entry = getPricingEntry('claude-opus-4-6:api');
    expect(entry).toBeDefined();
    expect(entry?.tier).toBe('flagship');
  });

  it('returns undefined for unknown ID', () => {
    expect(getPricingEntry('unknown:api')).toBeUndefined();
  });
});
