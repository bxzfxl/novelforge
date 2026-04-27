import { readSnapshotPayload, markResumed } from './snapshots';
import { runOperation, type RunParams } from './run-operation';
import { getSnapshot } from '@/lib/db/queries';
import type { ExecuteResult } from '@/lib/ai-providers/types';

/**
 * 恢复一个 pending 快照：重新使用原始参数调用 runOperation。
 * 注意：不复用原始 target_id，重新解析当前配置，
 * 允许用户在恢复前更改 model binding。
 */
export async function resumeSnapshot(snapshotId: string): Promise<ExecuteResult> {
  const snap = getSnapshot(snapshotId);
  if (!snap) throw new Error(`Snapshot ${snapshotId} not found`);
  if (snap.status !== 'pending') {
    throw new Error(`Snapshot ${snapshotId} is not pending (status: ${snap.status})`);
  }

  const payload = (await readSnapshotPayload(snapshotId)) as {
    operationId: string;
    params: RunParams;
  };

  // 去除 targetId 和 operationId，让 runOperation 重新解析
  const { targetId: _t, operationId: _o, ...rest } = payload.params as RunParams & {
    targetId?: string;
    operationId?: string;
  };

  const result = await runOperation(payload.operationId, rest);
  markResumed(snapshotId);
  return result;
}
