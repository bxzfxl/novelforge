/**
 * budget 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import * as dbModule from '@/lib/db/index';

describe('GET /api/budget', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('返回默认 budget config', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.budget).toHaveProperty('daily_budget_usd');
    expect(json.budget).toHaveProperty('warn_threshold_pct');
  });
});

describe('PUT /api/budget', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('更新 daily_budget_usd', async () => {
    const { PUT } = await import('../route');
    const req = new Request('http://localhost/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_budget_usd: 50 }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.budget.daily_budget_usd).toBe(50);
  });
});

describe('GET /api/budget/check', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('返回 ok 状态（budget=0 时不限制）', async () => {
    const { GET } = await import('../check/route');
    const req = new Request('http://localhost/api/budget/check?operation_id=writer.main');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.level).toBe('ok');
  });
});
