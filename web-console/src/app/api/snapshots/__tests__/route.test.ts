/**
 * snapshots 路由单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import * as dbModule from '@/lib/db/index';

describe('GET /api/snapshots', () => {
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

  it('空库返回空数组', async () => {
    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/snapshots');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshots).toEqual([]);
  });

  it('按 status 过滤', async () => {
    // 插入一条 pending 快照
    db.prepare(`
      INSERT INTO pipeline_snapshots (id, timestamp, operation_id, attempted_target_id,
        failure_category, failure_message, payload_file_path, status)
      VALUES ('snap1', datetime('now'), 'writer.main', 'claude-sonnet-4-6:api',
        'transient', 'timeout', '/tmp/snap1.json', 'pending')
    `).run();
    db.prepare(`
      INSERT INTO pipeline_snapshots (id, timestamp, operation_id, attempted_target_id,
        failure_category, failure_message, payload_file_path, status)
      VALUES ('snap2', datetime('now'), 'writer.main', 'claude-sonnet-4-6:api',
        'transient', 'timeout', '/tmp/snap2.json', 'resumed')
    `).run();

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/snapshots?status=pending');
    const res = await GET(req);
    const json = await res.json();
    expect(json.snapshots).toHaveLength(1);
    expect(json.snapshots[0].id).toBe('snap1');
  });
});

describe('POST /api/snapshots/[id]/abandon', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    // 插入一条快照
    db.prepare(`
      INSERT INTO pipeline_snapshots (id, timestamp, operation_id, attempted_target_id,
        failure_category, failure_message, payload_file_path, status)
      VALUES ('snap1', datetime('now'), 'writer.main', 'claude-sonnet-4-6:api',
        'transient', 'timeout', '/tmp/snap1.json', 'pending')
    `).run();
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('标记快照为 abandoned', async () => {
    const { POST } = await import('../[id]/abandon/route');
    const req = new Request('http://localhost/api/snapshots/snap1/abandon', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'snap1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // 验证 DB 状态
    const row = db.prepare('SELECT status FROM pipeline_snapshots WHERE id = ?').get('snap1') as { status: string };
    expect(row.status).toBe('abandoned');
  });
});
