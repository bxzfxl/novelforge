import { NextResponse } from 'next/server';
import { setOperationEnabled, getOperation } from '@/lib/db/queries';

interface Context {
  params: Promise<{ id: string }>;
}

/** PATCH /api/operations/:id — 切换 is_enabled */
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const op = getOperation(id);
  if (!op) {
    return NextResponse.json({ ok: false, error: 'Operation not found' }, { status: 404 });
  }

  const body = (await request.json()) as { is_enabled?: boolean };
  if (typeof body.is_enabled !== 'boolean') {
    return NextResponse.json(
      { ok: false, error: 'is_enabled boolean required' },
      { status: 400 },
    );
  }

  setOperationEnabled(id, body.is_enabled);
  return NextResponse.json({ ok: true });
}
