import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export function getDbPath(projectName: string): string {
  const userData = app.getPath('userData')
  const dir = path.join(userData, 'projects', projectName)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'project.db')
}

export function openDb(projectName: string): Database.Database {
  const dbPath = getDbPath(projectName)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function migrate(db: Database.Database): void {
  const migrationPath = path.join(__dirname, '..', '..', 'src', 'main', 'db', 'migrations', '001-init.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  db.exec(sql)
}
