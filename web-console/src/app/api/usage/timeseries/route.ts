import { NextResponse } from 'next/server';
import { getUsageTimeseries } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') ?? '30');
  return NextResponse.json({ rows: getUsageTimeseries(days) });
}
