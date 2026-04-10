import { NextResponse } from 'next/server';
import { getUsageSummary } from '@/lib/db/queries';

export async function GET() {
  return NextResponse.json(getUsageSummary());
}
