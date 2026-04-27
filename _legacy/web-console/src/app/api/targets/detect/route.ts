import { NextResponse } from 'next/server';
import { listModelTargets, updateTargetAvailability } from '@/lib/db/queries';
import { getAdapter } from '@/lib/ai-providers/factory';
import { registerAllAdapters } from '@/lib/ai-providers/adapters';

/** POST /api/targets/detect — 对所有 targets 运行可用性检测 */
export async function POST() {
  registerAllAdapters();
  const targets = listModelTargets();
  const results: Array<{ id: string; available: boolean; reason?: string }> = [];

  for (const target of targets) {
    try {
      const adapter = getAdapter(target.provider, target.mode);
      const result = await adapter.detectAvailability(target.id);
      updateTargetAvailability(target.id, result.available, result.reason ?? null);
      results.push({ id: target.id, available: result.available, reason: result.reason });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      updateTargetAvailability(target.id, false, reason);
      results.push({ id: target.id, available: false, reason });
    }
  }

  return NextResponse.json({ ok: true, results });
}
