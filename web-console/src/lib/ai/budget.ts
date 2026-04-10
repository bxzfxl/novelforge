import { getBudgetConfig, getTodayCost } from '@/lib/db/queries';
import {
  BudgetSoftBlockedError,
  BudgetHardBlockedError,
} from '@/lib/ai-providers/errors';
import type { BudgetState } from '@/lib/ai-providers/types';

/**
 * 执行预算阈值检测。在 hard_block 或 soft_block 时抛出异常（unless confirmed）。
 * 返回当前状态供调用方处理 warn 级别通知。
 */
export function enforceBudget(
  _operationId: string,
  opts: { allowSoftBlockConfirmed?: boolean } = {},
): BudgetState {
  const budget = getBudgetConfig();
  if (budget.daily_budget_usd === 0) {
    return { level: 'ok' };
  }

  const todayCost = getTodayCost();
  const pct = (todayCost / budget.daily_budget_usd) * 100;

  if (pct >= budget.hard_block_threshold_pct) {
    throw new BudgetHardBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.soft_block_threshold_pct) {
    if (opts.allowSoftBlockConfirmed) {
      return { level: 'soft_block', pct, budget: budget.daily_budget_usd, todayCost };
    }
    throw new BudgetSoftBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.warn_threshold_pct) {
    return { level: 'warn', pct, budget: budget.daily_budget_usd, todayCost };
  }
  return { level: 'ok' };
}

/**
 * 非抛出版本，供 UI 使用。始终返回状态，不抛出异常。
 */
export function checkBudget(operationId: string): BudgetState {
  try {
    return enforceBudget(operationId, { allowSoftBlockConfirmed: true });
  } catch (err) {
    if (err instanceof BudgetHardBlockedError) {
      return {
        level: 'hard_block',
        pct: err.pct,
        budget: err.budget,
        todayCost: (err.pct / 100) * err.budget,
      };
    }
    throw err;
  }
}
