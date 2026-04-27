import { NextResponse } from 'next/server';
import { listModelTargets } from '@/lib/db/queries';

/** GET /api/targets — 列出所有 model targets */
export async function GET() {
  const targets = listModelTargets();
  return NextResponse.json({
    targets: targets.map((t) => ({
      id: t.id,
      modelId: t.model_id,
      provider: t.provider,
      mode: t.mode,
      displayName: t.display_name,
      description: t.description,
      inputPricePer1M: t.input_price_per_1m,
      outputPricePer1M: t.output_price_per_1m,
      cacheReadPricePer1M: t.cache_read_price_per_1m,
      contextWindow: t.context_window,
      tier: t.tier,
      available: t.available === 1,
      availabilityReason: t.availability_reason,
      lastCheckedAt: t.last_checked_at,
    })),
  });
}
