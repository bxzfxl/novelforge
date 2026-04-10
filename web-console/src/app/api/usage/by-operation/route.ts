import { NextResponse } from 'next/server';
import { getUsageByOperation, getUsageByModel } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupBy = url.searchParams.get('group_by') ?? 'operation';
  const days = Number(url.searchParams.get('days') ?? '30');

  if (groupBy === 'model') {
    return NextResponse.json({ rows: getUsageByModel(days) });
  }
  return NextResponse.json({ rows: getUsageByOperation(days) });
}
