import Database from 'better-sqlite3'
import type { AppSettings } from '@novelforge/shared'

export function getSetting(db: Database.Database, key: string): any {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  if (!row) return undefined
  return JSON.parse(row.value)
}

export function setSetting(db: Database.Database, key: string, value: any): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))")
    .run(key, JSON.stringify(value))
}
