import {
  getOperation,
  getOperationOverride,
  getCategoryDefault,
  getModelTarget,
  type ModelTargetRow,
} from '@/lib/db/queries';
import {
  OperationNotConfiguredError,
  OperationDisabledError,
} from '@/lib/ai-providers/errors';

/**
 * 将 operationId 解析为实际使用的 ModelTarget。
 * 优先级：
 *   1. 操作级别 override
 *   2. 分类级别 default
 *   3. 抛出 OperationNotConfiguredError
 *
 * 若操作已禁用，则抛出 OperationDisabledError。
 */
export function resolveOperationTarget(operationId: string): ModelTargetRow {
  const op = getOperation(operationId);
  if (!op) {
    throw new OperationNotConfiguredError(operationId);
  }
  if (!op.is_enabled) {
    throw new OperationDisabledError(operationId);
  }

  // 1. 操作级别 override
  const overrideTargetId = getOperationOverride(operationId);
  if (overrideTargetId) {
    const target = getModelTarget(overrideTargetId);
    if (target) return target;
  }

  // 2. 分类级别 default
  const catTargetId = getCategoryDefault(op.category);
  if (catTargetId) {
    const target = getModelTarget(catTargetId);
    if (target) return target;
  }

  // 3. 未找到任何配置
  throw new OperationNotConfiguredError(operationId);
}
