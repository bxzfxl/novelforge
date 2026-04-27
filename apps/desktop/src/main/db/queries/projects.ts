import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { Project } from '@novelforge/shared'

export function createProject(
  db: Database.Database,
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Project {
  const id = uuid()
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, title, author, genre, sub_genre, target_words, synopsis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(id, data.name, data.title, data.author, data.genre, data.subGenre ?? null, data.targetWords, data.synopsis)
  return getProject(db, id)!
}

export function getProject(db: Database.Database, id: string): Project | undefined {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  if (!row) return undefined
  return rowToProject(row)
}

export function listProjects(db: Database.Database): Project[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[]
  return rows.map(rowToProject)
}

export function updateProject(db: Database.Database, id: string, data: Partial<Project>): Project | undefined {
  const sets: string[] = []
  const vals: any[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    const col = camelToSnake(k)
    sets.push(`${col} = ?`)
    vals.push(v)
  }
  if (sets.length === 0) return getProject(db, id)
  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  return getProject(db, id)
}

export function deleteProject(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

function rowToProject(row: any): Project {
  return {
    id: row.id, name: row.name, title: row.title, author: row.author,
    genre: row.genre, subGenre: row.sub_genre ?? undefined,
    targetWords: row.target_words, synopsis: row.synopsis,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
}
