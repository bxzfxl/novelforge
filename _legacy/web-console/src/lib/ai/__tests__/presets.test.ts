import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('presets', () => {
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

  it('has 6 presets', async () => {
    const { PRESETS } = await import('../presets');
    expect(PRESETS.length).toBe(6);
  });

  it('all preset target IDs exist in model_targets', async () => {
    const { PRESETS } = await import('../presets');
    const { listModelTargets } = await import('@/lib/db/queries');
    const validIds = new Set(listModelTargets().map((t) => t.id));

    for (const preset of PRESETS) {
      for (const targetId of Object.values(preset.categoryDefaults)) {
        expect(validIds.has(targetId), `targetId ${targetId} not found in model_targets`).toBe(true);
      }
      for (const targetId of Object.values(preset.overrides)) {
        expect(validIds.has(targetId), `targetId ${targetId} not found in model_targets`).toBe(true);
      }
    }
  });

  it('applyPreset sets category defaults and overrides', async () => {
    const { applyPreset } = await import('../presets');
    const { getCategoryDefault, getOperationOverride } = await import('@/lib/db/queries');

    applyPreset('balanced');

    expect(getCategoryDefault('writer')).toBe('deepseek-chat:api');
    expect(getOperationOverride('writer.main')).toBe('claude-sonnet-4-6:api');
    expect(getOperationOverride('writer.architect')).toBe('claude-opus-4-6:api');
  });

  it('applyPreset wipes old bindings first', async () => {
    const { applyPreset } = await import('../presets');
    const { getCategoryDefault, getOperationOverride, setOperationOverride } =
      await import('@/lib/db/queries');

    // 预先存在的 override，不在 balanced preset 中
    setOperationOverride('writer.foreshadow_weaver', 'claude-opus-4-6:api');

    applyPreset('balanced');

    // 应被清除（balanced 不覆盖 foreshadow_weaver）
    expect(getOperationOverride('writer.foreshadow_weaver')).toBeUndefined();
    // balanced 自身的 overrides 应被写入
    expect(getOperationOverride('writer.main')).toBe('claude-sonnet-4-6:api');
  });

  it('budget preset uses only DeepSeek', async () => {
    const { PRESETS } = await import('../presets');
    const budget = PRESETS.find((p) => p.id === 'budget')!;
    for (const targetId of Object.values(budget.categoryDefaults)) {
      expect(targetId).toBe('deepseek-chat:api');
    }
    expect(Object.keys(budget.overrides).length).toBe(0);
  });

  it('cli-only preset uses only CLI targets', async () => {
    const { PRESETS } = await import('../presets');
    const cli = PRESETS.find((p) => p.id === 'cli-only')!;
    for (const targetId of Object.values(cli.categoryDefaults)) {
      expect(targetId).toMatch(/:cli$/);
    }
    for (const targetId of Object.values(cli.overrides)) {
      expect(targetId).toMatch(/:cli$/);
    }
  });
});
