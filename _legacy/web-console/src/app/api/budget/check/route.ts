import { NextResponse } from 'next/server';
import { checkBudget } from '@/lib/ai/budget';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opId = url.searchParams.get('operation_id') ?? 'project.brainstorm';
  try {
    const state = checkBudget(opId);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
