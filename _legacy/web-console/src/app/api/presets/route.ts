import { NextResponse } from 'next/server';
import { PRESETS } from '@/lib/ai/presets';

export async function GET() {
  return NextResponse.json({ presets: PRESETS });
}
