import { NextResponse } from 'next/server';
import {
  listOperations,
  getCategoryDefault,
  getOperationOverride,
  listModelTargets,
} from '@/lib/db/queries';

/** GET /api/operations — 返回所有 operations 及其已解析的绑定关系 */
export async function GET() {
  const operations = listOperations();
  const targets = listModelTargets();
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  const result = operations.map((op) => {
    const overrideId = getOperationOverride(op.id);
    const categoryDefaultId = getCategoryDefault(op.category);
    const effectiveTargetId = overrideId ?? categoryDefaultId ?? null;
    const effectiveTarget = effectiveTargetId ? targetMap.get(effectiveTargetId) : null;

    return {
      id: op.id,
      category: op.category,
      displayName: op.display_name,
      description: op.description,
      recommendedTier: op.recommended_tier,
      recommendedRationale: op.recommended_rationale,
      isEnabled: op.is_enabled === 1,
      sortOrder: op.sort_order,
      override: overrideId,
      categoryDefault: categoryDefaultId,
      effectiveTarget: effectiveTarget
        ? {
            id: effectiveTarget.id,
            displayName: effectiveTarget.display_name,
            provider: effectiveTarget.provider,
            mode: effectiveTarget.mode,
          }
        : null,
      isOverridden: overrideId != null,
    };
  });

  return NextResponse.json({ operations: result });
}
