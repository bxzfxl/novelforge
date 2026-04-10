/**
 * usage 分析路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';

describe('GET /api/usage/summary', () => {
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

  it('空库返回全 0 汇总', async () => {
    const { GET } = await import('../summary/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('today');
    expect(json).toHaveProperty('week');
    expect(json).toHaveProperty('month');
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('cliSavedMonth');
    expect(json.total).toBe(0);
  });
});

describe('GET /api/usage/by-operation', () => {
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

  it('空库返回空 rows', async () => {
    const { GET } = await import('../by-operation/route');
    const req = new Request('http://localhost/api/usage/by-operation');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toEqual([]);
  });

  it('group_by=model 时返回 model 分组', async () => {
    const { GET } = await import('../by-operation/route');
    const req = new Request('http://localhost/api/usage/by-operation?group_by=model&days=7');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rows)).toBe(true);
  });
});

describe('GET /api/usage/timeseries', () => {
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

  it('空库返回空 rows', async () => {
    const { GET } = await import('../timeseries/route');
    const req = new Request('http://localhost/api/usage/timeseries?days=30');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toEqual([]);
  });
});
