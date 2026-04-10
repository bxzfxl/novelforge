import { NextResponse } from 'next/server';
import { applyPreset } from '@/lib/ai/presets';

export async function POST(request: Request) {
  const body = (await request.json()) as { preset_id?: string };
  if (!body.preset_id) {
    return NextResponse.json({ ok: false, error: 'preset_id required' }, { status: 400 });
  }
  try {
    applyPreset(body.preset_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
