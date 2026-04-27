import { NextResponse } from 'next/server';
import { listSnapshots } from '@/lib/db/queries';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') as
    | 'pending'
    | 'resumed'
    | 'abandoned'
    | null;

  const rows = listSnapshots(status ?? undefined);
  return NextResponse.json({ snapshots: rows });
}
