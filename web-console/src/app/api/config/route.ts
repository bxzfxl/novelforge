/**
 * /api/config — 配置读写接口
 *
 * GET  读取所有配置项，加密字段的值显示为 '••••••••'
 * PUT  批量更新配置，跳过值为 '••••••••' 的字段（避免覆盖加密值），
 *      key 中含有 'key' 或 'secret' 的字段自动标记为 encrypted
 */

import { getDb } from '@/lib/db';
import { setConfig } from '@/lib/db/queries';

/** config 表行类型 */
interface ConfigRow {
  key: string;
  value: string;
  encrypted: number;
  updated_at: string;
}

/** 加密字段的占位符 */
const MASKED = '••••••••';

// ──────────────────────────────────────────────────────────
// GET /api/config
// ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const rows = getDb()
      .prepare('SELECT key, value, encrypted, updated_at FROM config ORDER BY key')
      .all() as ConfigRow[];

    // 加密字段用占位符替换真实值，避免敏感信息泄露到前端
    const data = rows.map((row) => ({
      key: row.key,
      value: row.encrypted ? MASKED : row.value,
      encrypted: Boolean(row.encrypted),
      updated_at: row.updated_at,
    }));

    return Response.json({ data });
  } catch (error) {
    return Response.json(
      { error: `读取配置失败: ${String(error)}` },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────────────────────────
// PUT /api/config
// ──────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;

    let updated = 0;
    for (const [key, value] of Object.entries(body)) {
      // 跳过占位符值，不覆盖已存在的加密字段
      if (value === MASKED) continue;

      // key 中含有 'key' 或 'secret' 时标记为加密字段
      const isEncrypted =
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('secret');

      setConfig(key, String(value), isEncrypted);
      updated++;
    }

    return Response.json({ ok: true, updated });
  } catch (error) {
    return Response.json(
      { error: `保存配置失败: ${String(error)}` },
      { status: 500 },
    );
  }
}
