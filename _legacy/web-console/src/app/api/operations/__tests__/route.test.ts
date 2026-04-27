/**
 * GET /api/operations 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('GET /api/operations', () => {
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

  it('返回所有 operations 列表', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.operations)).toBe(true);
    expect(json.operations.length).toBeGreaterThan(0);
  });

  it('每个 operation 包含必要字段', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    const json = await res.json();
    const op = json.operations[0];
    expect(op).toHaveProperty('id');
    expect(op).toHaveProperty('category');
    expect(op).toHaveProperty('isEnabled');
    expect(op).toHaveProperty('isOverridden');
    expect(op).toHaveProperty('effectiveTarget');
  });
});

describe('PATCH /api/operations/[id]', () => {
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

  it('404 — operation 不存在', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = new Request('http://localhost/api/operations/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('400 — is_enabled 不是 boolean', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = new Request('http://localhost/api/operations/writer.main', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: 'yes' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'writer.main' }) });
    expect(res.status).toBe(400);
  });

  it('200 — 成功禁用 operation', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = new Request('http://localhost/api/operations/writer.main', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'writer.main' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
