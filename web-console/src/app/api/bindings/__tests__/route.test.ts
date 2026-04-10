/**
 * POST /api/bindings/category + /api/bindings/override 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('POST /api/bindings/category', () => {
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

  it('400 — 缺少 category', async () => {
    const { POST } = await import('../category/route');
    const req = new Request('http://localhost/api/bindings/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('200 — 设置 category default', async () => {
    const { POST } = await import('../category/route');
    const req = new Request('http://localhost/api/bindings/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'writer', target_id: 'claude-sonnet-4-6:api' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('200 — 清除 category default（无 target_id）', async () => {
    const { POST } = await import('../category/route');
    const req = new Request('http://localhost/api/bindings/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'writer' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/bindings/override', () => {
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

  it('400 — 缺少 operation_id', async () => {
    const { POST } = await import('../override/route');
    const req = new Request('http://localhost/api/bindings/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('200 — 设置 operation override', async () => {
    const { POST } = await import('../override/route');
    const req = new Request('http://localhost/api/bindings/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_id: 'writer.main', target_id: 'claude-sonnet-4-6:api' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('200 — 清除 operation override（无 target_id）', async () => {
    const { POST } = await import('../override/route');
    const req = new Request('http://localhost/api/bindings/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_id: 'writer.main' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
