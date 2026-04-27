import { NextResponse } from 'next/server';
import { setOperationOverride, clearOperationOverride } from '@/lib/db/queries';

/** POST /api/bindings/override — 设置 operation 级覆盖，target_id 为空则清除 */
export async function POST(request: Request) {
  const body = (await request.json()) as { operation_id?: string; target_id?: string };
  if (!body.operation_id) {
    return NextResponse.json({ ok: false, error: 'operation_id required' }, { status: 400 });
  }

  if (!body.target_id) {
    clearOperationOverride(body.operation_id);
  } else {
    setOperationOverride(body.operation_id, body.target_id);
  }

  return NextResponse.json({ ok: true });
}
