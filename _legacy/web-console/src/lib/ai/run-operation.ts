import type { ExecuteParams, ExecuteResult, StreamChunk } from '@/lib/ai-providers/types';
import { resolveOperationTarget } from './resolve-target';
import { enforceBudget } from './budget';
import { getAdapterForTarget } from '@/lib/ai-providers/factory';
import { insertTokenUsageV2 } from '@/lib/db/queries';
import { createFailureSnapshot } from './snapshots';
import { OperationFailedError } from '@/lib/ai-providers/errors';

/**
 * 生产环境使用前需先调用 registerAllAdapters()（通常在应用入口处）。
 * 测试环境通过 registerAdapter 直接注册 mock 适配器。
 */

export type RunParams = Omit<ExecuteParams, 'targetId' | 'operationId'>;

/**
 * 执行一次 operation：解析 target → 检查预算 → 分发适配器 →
 * 记录用量 → 失败时创建快照并抛出 OperationFailedError。
 */
export async function runOperation(
  operationId: string,
  params: RunParams,
): Promise<ExecuteResult> {
  // 1. 解析目标（未配置或已禁用时抛出）
  const target = resolveOperationTarget(operationId);

  // 2. 检查预算
  enforceBudget(operationId);

  // 3. 获取适配器并执行
  const adapter = getAdapterForTarget(target.id);
  const fullParams: ExecuteParams = {
    ...params,
    targetId: target.id,
    operationId,
  };

  try {
    const result = await adapter.execute(fullParams);

    // 4. 记录用量
    insertTokenUsageV2({
      cli_type: adapter.mode,
      model: target.model_id,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cache_read_tokens: result.usage.cacheReadTokens,
      cache_write_tokens: result.usage.cacheWriteTokens,
      target_id: target.id,
      operation_id: operationId,
      cost_usd: result.costUsd,
      was_cli_mode: result.wasCliMode,
    });

    return result;
  } catch (err) {
    // 5. 创建快照
    const snapshot = await createFailureSnapshot({
      operationId,
      targetId: target.id,
      params: fullParams,
      error: err instanceof Error ? err : new Error(String(err)),
    });

    throw new OperationFailedError(
      operationId,
      err instanceof Error ? err : new Error(String(err)),
      snapshot.id,
    );
  }
}

/**
 * 流式版本。流完成后才记录用量。
 */
export async function* runOperationStream(
  operationId: string,
  params: RunParams,
): AsyncIterable<StreamChunk> {
  const target = resolveOperationTarget(operationId);
  enforceBudget(operationId);

  const adapter = getAdapterForTarget(target.id);
  const fullParams: ExecuteParams = { ...params, targetId: target.id, operationId };

  let finalUsage: ExecuteResult['usage'] | null = null;

  try {
    for await (const chunk of adapter.stream(fullParams)) {
      if (chunk.type === 'usage') {
        finalUsage = chunk.usage;
      }
      yield chunk;
    }

    if (finalUsage) {
      // 从 pricing 计算费用
      const { getPricingEntry, computeCost } = await import('./pricing');
      const pricing = getPricingEntry(target.id);
      const costUsd = pricing ? computeCost(pricing, finalUsage) : 0;

      insertTokenUsageV2({
        cli_type: adapter.mode,
        model: target.model_id,
        input_tokens: finalUsage.inputTokens,
        output_tokens: finalUsage.outputTokens,
        cache_read_tokens: finalUsage.cacheReadTokens,
        cache_write_tokens: finalUsage.cacheWriteTokens,
        target_id: target.id,
        operation_id: operationId,
        cost_usd: costUsd,
        was_cli_mode: adapter.mode === 'cli',
      });
    }
  } catch (err) {
    const snapshot = await createFailureSnapshot({
      operationId,
      targetId: target.id,
      params: fullParams,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw new OperationFailedError(
      operationId,
      err instanceof Error ? err : new Error(String(err)),
      snapshot.id,
    );
  }
}
