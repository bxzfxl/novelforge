import { NextResponse } from 'next/server';
import { getBudgetConfig, updateBudgetConfig } from '@/lib/db/queries';

export async function GET() {
  const cfg = getBudgetConfig();
  return NextResponse.json({ budget: cfg });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    daily_budget_usd?: number;
    warn_threshold_pct?: number;
    soft_block_threshold_pct?: number;
    hard_block_threshold_pct?: number;
    fallback_target_id?: string | null;
  };

  // 确保 budget_config 行已存在（getBudgetConfig 会自动初始化 id=1 行）
  getBudgetConfig();
  updateBudgetConfig(body);
  return NextResponse.json({ ok: true, budget: getBudgetConfig() });
}
