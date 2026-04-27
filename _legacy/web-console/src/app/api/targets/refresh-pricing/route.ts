import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedModelTargets } from '@/lib/db/seed-model-targets';

/** POST /api/targets/refresh-pricing — 重新执行 seed（保留 price_manually_edited=1 的行） */
export async function POST() {
  const count = seedModelTargets(getDb());
  return NextResponse.json({ ok: true, refreshed: count });
}
