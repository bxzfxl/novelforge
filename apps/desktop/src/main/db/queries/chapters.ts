import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { ChapterMeta } from '@novelforge/shared'

export function createChapter(
  db: Database.Database,
  data: Omit<ChapterMeta, 'id' | 'createdAt' | 'revisedAt'>
): ChapterMeta {
  const id = uuid()
  db.prepare(`
    INSERT INTO chapters (id, volume_id, number, title, status, word_count, target_words, pov, characters, locations, ai_model, ai_tokens, ai_cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.volumeId, data.number, data.title, data.status, data.wordCount, data.targetWords,
    data.pov, JSON.stringify(data.characters), JSON.stringify(data.locations),
    data.aiModel, data.aiTokens, data.aiCostUsd)
  return getChapter(db, id)!
}

export function getChapter(db: Database.Database, id: string): ChapterMeta | undefined {
  const row = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as any
  if (!row) return undefined
  return rowToChapter(row)
}

export function listChapters(db: Database.Database, volumeId: string): ChapterMeta[] {
  const rows = db.prepare('SELECT * FROM chapters WHERE volume_id = ? ORDER BY number').all(volumeId) as any[]
  return rows.map(rowToChapter)
}

export function updateChapter(db: Database.Database, id: string, data: Partial<ChapterMeta>): ChapterMeta | undefined {
  const sets: string[] = []
  const vals: any[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (k === 'characters' || k === 'locations' || k === 'events' || k === 'foreshadowPlanted' || k === 'foreshadowResolved') {
      sets.push(`${camelToSnake(k)} = ?`)
      vals.push(JSON.stringify(v))
    } else {
      sets.push(`${camelToSnake(k)} = ?`)
      vals.push(v)
    }
  }
  if (sets.length === 0) return getChapter(db, id)
  sets.push("revised_at = datetime('now')")
  db.prepare(`UPDATE chapters SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  return getChapter(db, id)
}

function rowToChapter(row: any): ChapterMeta {
  return {
    id: row.id, volumeId: row.volume_id, number: row.number, title: row.title,
    status: row.status, wordCount: row.word_count, targetWords: row.target_words,
    pov: row.pov, characters: JSON.parse(row.characters || '[]'),
    locations: JSON.parse(row.locations || '[]'), events: JSON.parse(row.events || '[]'),
    foreshadowPlanted: JSON.parse(row.foreshadow_planted || '[]'),
    foreshadowResolved: JSON.parse(row.foreshadow_resolved || '[]'),
    aiModel: row.ai_model, aiTokens: row.ai_tokens, aiCostUsd: row.ai_cost_usd,
    createdAt: row.created_at, revisedAt: row.revised_at,
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
}
