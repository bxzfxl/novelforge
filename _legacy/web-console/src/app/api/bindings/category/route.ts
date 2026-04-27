import { NextResponse } from 'next/server';
import { setCategoryDefault, clearCategoryDefault } from '@/lib/db/queries';

/** POST /api/bindings/category — 设置分类默认 target，target_id 为空则清除 */
export async function POST(request: Request) {
  const body = (await request.json()) as { category?: string; target_id?: string };
  if (!body.category) {
    return NextResponse.json({ ok: false, error: 'category required' }, { status: 400 });
  }

  if (!body.target_id) {
    clearCategoryDefault(body.category);
  } else {
    setCategoryDefault(body.category, body.target_id);
  }

  return NextResponse.json({ ok: true });
}
