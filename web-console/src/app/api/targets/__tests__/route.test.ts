/**
 * GET /api/targets 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';

describe('GET /api/targets', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('返回 targets 数组', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.targets)).toBe(true);
    expect(json.targets.length).toBeGreaterThan(0);
  });

  it('每个 target 包含 id/provider/mode/available', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    const json = await res.json();
    const t = json.targets[0];
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('provider');
    expect(t).toHaveProperty('mode');
    expect(typeof t.available).toBe('boolean');
  });
});
