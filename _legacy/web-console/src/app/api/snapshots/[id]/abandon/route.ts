import { NextResponse } from 'next/server';
import { markAbandoned } from '@/lib/ai/snapshots';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  markAbandoned(id);
  return NextResponse.json({ ok: true });
}
