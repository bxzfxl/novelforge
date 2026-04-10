import { NextResponse } from 'next/server';
import { resumeSnapshot } from '@/lib/ai/resume';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const result = await resumeSnapshot(id);
    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      costUsd: result.costUsd,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
