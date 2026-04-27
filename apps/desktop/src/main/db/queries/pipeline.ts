import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { PipelineState, PipelineStep } from '@novelforge/shared'

export function createPipelineRun(db: Database.Database, projectId: string, totalChapters: number): PipelineState {
  const id = uuid()
  db.prepare(`
    INSERT INTO pipeline_runs (id, project_id, total_chapters) VALUES (?, ?, ?)
  `).run(id, projectId, totalChapters)
  return getPipelineRun(db, id)!
}

export function getPipelineRun(db: Database.Database, id: string): PipelineState | undefined {
  const row = db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id) as any
  if (!row) return undefined
  return {
    id: row.id, projectId: row.project_id, status: row.status, phase: row.phase,
    currentChapterId: row.current_chapter_id, currentVolumeId: row.current_volume_id,
    steps: JSON.parse(row.steps || '[]'), totalChapters: row.total_chapters,
    completedChapters: row.completed_chapters, totalTokens: row.total_tokens,
    totalCostUsd: row.total_cost_usd, startedAt: row.started_at,
  }
}

export function getActivePipelineRun(db: Database.Database, projectId: string): PipelineState | undefined {
  const row = db.prepare(
    "SELECT * FROM pipeline_runs WHERE project_id = ? AND status NOT IN ('completed', 'error') ORDER BY started_at DESC LIMIT 1"
  ).get(projectId) as any
  if (!row) return undefined
  return {
    id: row.id, projectId: row.project_id, status: row.status, phase: row.phase,
    currentChapterId: row.current_chapter_id, currentVolumeId: row.current_volume_id,
    steps: JSON.parse(row.steps || '[]'), totalChapters: row.total_chapters,
    completedChapters: row.completed_chapters, totalTokens: row.total_tokens,
    totalCostUsd: row.total_cost_usd, startedAt: row.started_at,
  }
}

export function updatePipelineRun(db: Database.Database, id: string, data: Partial<PipelineState>): void {
  const sets: string[] = []
  const vals: any[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (k === 'steps') {
      sets.push('steps = ?')
      vals.push(JSON.stringify(v))
    } else {
      sets.push(`${camelToSnake(k)} = ?`)
      vals.push(v)
    }
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE pipeline_runs SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
}
