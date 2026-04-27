import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import {
  insertSnapshot,
  getSnapshot,
  updateSnapshotStatus,
  type PipelineSnapshotRow,
} from '@/lib/db/queries';
import { classifyError } from '@/lib/ai-providers/errors';
import type { ExecuteParams } from '@/lib/ai-providers/types';

function getSnapshotDir(): string {
  // 允许通过环境变量覆盖（测试用，避免并行测试文件写入冲突）
  return (
    process.env.NOVELFORGE_SNAPSHOT_DIR ??
    path.resolve(process.cwd(), '..', 'workspace', 'snapshots')
  );
}

async function ensureSnapshotDir(): Promise<void> {
  await mkdir(getSnapshotDir(), { recursive: true });
}

export interface FailureContext {
  operationId: string;
  targetId: string;
  params: ExecuteParams;
  error: Error;
}

export interface CreatedSnapshot {
  id: string;
  payloadPath: string;
  category: 'transient' | 'permanent' | 'unknown';
}

/**
 * 创建失败快照：写入 payload 文件，插入 DB 行。
 * 对非 permanent 错误尝试调用 fallback 模型做 AI 分析；
 * 若 fallback 不可用，则降级为 null summary（仍创建快照）。
 */
export async function createFailureSnapshot(
  ctx: FailureContext,
): Promise<CreatedSnapshot> {
  await ensureSnapshotDir();

  const snapshotId = nanoid(12);
  const category = classifyError(ctx.error);
  const payloadPath = path.join(getSnapshotDir(), `${snapshotId}.json`);

  const payload = {
    operationId: ctx.operationId,
    targetId: ctx.targetId,
    params: ctx.params,
    errorName: ctx.error.name,
    errorMessage: ctx.error.message,
    errorStack: ctx.error.stack ?? null,
    timestamp: new Date().toISOString(),
  };

  await writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf8');

  // AI 分析：尽力而为。失败则降级为 null summary。
  let aiSummary: string | null = null;
  let resumeHint: string | null = null;

  if (category !== 'permanent') {
    try {
      const analysis = await attemptFallbackAnalysis(ctx);
      aiSummary = analysis.summary;
      resumeHint = analysis.hint;
    } catch {
      // fallback 也失败了 — 按规格 4-A 降级为纯序列化，不影响快照创建
      aiSummary = null;
      resumeHint = null;
    }
  }

  insertSnapshot({
    id: snapshotId,
    timestamp: payload.timestamp,
    operation_id: ctx.operationId,
    attempted_target_id: ctx.targetId,
    failure_category: category,
    failure_message: ctx.error.message,
    payload_file_path: payloadPath,
    ai_summary: aiSummary,
    resume_hint: resumeHint,
    status: 'pending',
    resumed_at: null,
  });

  return { id: snapshotId, payloadPath, category };
}

/**
 * 尝试通过 fallback 模型分析失败原因。
 * 若 budget 未配置 fallback_target_id，抛出异常触发 null summary 路径。
 */
export async function attemptFallbackAnalysis(
  ctx: FailureContext,
): Promise<{ summary: string; hint: string }> {
  const { getBudgetConfig } = await import('@/lib/db/queries');
  const budget = getBudgetConfig();
  if (!budget.fallback_target_id) {
    throw new Error('No fallback target configured');
  }

  const { getAdapterForTarget } = await import('@/lib/ai-providers/factory');
  const adapter = getAdapterForTarget(budget.fallback_target_id);

  const analysisPrompt = `You are a failure analysis assistant. An AI operation just failed.

Operation: ${ctx.operationId}
Target: ${ctx.targetId}
Error: ${ctx.error.message}

Please analyze and output EXACTLY this JSON (no preamble, no code fences):
{
  "summary": "one-sentence description of what was being attempted",
  "hint": "specific recommendation for resuming"
}`;

  const result = await adapter.execute({
    targetId: budget.fallback_target_id,
    operationId: ctx.operationId,
    messages: [{ role: 'user', content: analysisPrompt }],
    maxTokens: 500,
    temperature: 0.2,
  });

  // 从响应中提取 JSON
  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Fallback model did not return valid JSON');

  const parsed = JSON.parse(match[0]) as { summary: string; hint: string };
  if (typeof parsed.summary !== 'string' || typeof parsed.hint !== 'string') {
    throw new Error('Fallback model returned malformed analysis');
  }
  return parsed;
}

/**
 * 读回快照的 payload 文件内容。
 */
export async function readSnapshotPayload(
  snapshotId: string,
): Promise<ReturnType<typeof JSON.parse>> {
  const row = getSnapshot(snapshotId);
  if (!row) throw new Error(`Snapshot ${snapshotId} not found`);
  const content = await readFile(row.payload_file_path, 'utf8');
  return JSON.parse(content);
}

/**
 * 标记快照为已恢复执行。
 */
export function markResumed(snapshotId: string): void {
  updateSnapshotStatus(snapshotId, 'resumed', new Date().toISOString());
}

/**
 * 标记快照为已放弃。
 */
export function markAbandoned(snapshotId: string): void {
  updateSnapshotStatus(snapshotId, 'abandoned');
}

// 类型重新导出，供测试使用
export type { PipelineSnapshotRow };
