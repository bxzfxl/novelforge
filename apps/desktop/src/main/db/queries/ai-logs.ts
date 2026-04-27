import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { AICallLog } from '@novelforge/shared'

export function insertAILog(db: Database.Database, log: Omit<AICallLog, 'id'>): AICallLog {
  const id = uuid()
  db.prepare(`
    INSERT INTO ai_call_logs (id, pipeline_run_id, role, model_id, provider, input_tokens, output_tokens, cost_usd, duration_ms, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, log.pipelineRunId ?? null, log.role, log.modelId, log.provider,
    log.inputTokens, log.outputTokens, log.costUsd, log.durationMs, log.status, log.error ?? null)
  return { ...log, id }
}

export function listAILogs(db: Database.Database, pipelineRunId?: string): AICallLog[] {
  const rows = pipelineRunId
    ? db.prepare('SELECT * FROM ai_call_logs WHERE pipeline_run_id = ? ORDER BY created_at DESC').all(pipelineRunId) as any[]
    : db.prepare('SELECT * FROM ai_call_logs ORDER BY created_at DESC LIMIT 100').all() as any[]
  return rows.map(rowToLog)
}

export function getTotalCost(db: Database.Database, pipelineRunId?: string): number {
  const row = pipelineRunId
    ? db.prepare('SELECT SUM(cost_usd) as total FROM ai_call_logs WHERE pipeline_run_id = ?').get(pipelineRunId) as any
    : db.prepare('SELECT SUM(cost_usd) as total FROM ai_call_logs').get() as any
  return row?.total ?? 0
}

function rowToLog(row: any): AICallLog {
  return {
    id: row.id, pipelineRunId: row.pipeline_run_id, role: row.role,
    modelId: row.model_id, provider: row.provider, inputTokens: row.input_tokens,
    outputTokens: row.output_tokens, costUsd: row.cost_usd, durationMs: row.duration_ms,
    status: row.status, error: row.error, createdAt: row.created_at,
  }
}
