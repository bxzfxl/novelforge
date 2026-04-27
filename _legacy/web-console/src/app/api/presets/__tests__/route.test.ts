/**
 * presets 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import { seedOperations } from '@/lib/db/seed-operations';
import * as dbModule from '@/lib/db/index';

describe('GET /api/presets', () => {
  it('返回 6 个预设定义', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.presets)).toBe(true);
    expect(json.presets.length).toBe(6);
    const ids = json.presets.map((p: { id: string }) => p.id);
    expect(ids).toContain('balanced');
    expect(ids).toContain('cli-only');
  });
});

describe('POST /api/presets/apply', () => {
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

  it('400 — 缺少 preset_id', async () => {
    const { POST } = await import('../apply/route');
    const req = new Request('http://localhost/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 — 未知 preset_id', async () => {
    const { POST } = await import('../apply/route');
    const req = new Request('http://localhost/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: 'unknown-preset' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('200 — 成功应用 budget 预设', async () => {
    const { POST } = await import('../apply/route');
    const req = new Request('http://localhost/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: 'budget' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
