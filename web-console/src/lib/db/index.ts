import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { SCHEMA } from './schema';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'novelforge.db');

let db: Database.Database | null = null;

/**
 * Migration 002: extend token_usage with cost tracking columns.
 * Uses PRAGMA table_info to detect existing columns and only adds missing ones.
 */
function runMigration002(db: Database.Database) {
  const existingCols = db.prepare('PRAGMA table_info(token_usage)').all() as { name: string }[];
  const colNames = new Set(existingCols.map((c) => c.name));

  const additions = [
    { name: 'target_id', sql: 'ALTER TABLE token_usage ADD COLUMN target_id TEXT REFERENCES model_targets(id)' },
    { name: 'operation_id', sql: 'ALTER TABLE token_usage ADD COLUMN operation_id TEXT REFERENCES ai_operations(id)' },
    { name: 'cost_usd', sql: 'ALTER TABLE token_usage ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0' },
    { name: 'cache_read_tokens', sql: 'ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0' },
    { name: 'cache_write_tokens', sql: 'ALTER TABLE token_usage ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0' },
    { name: 'was_cli_mode', sql: 'ALTER TABLE token_usage ADD COLUMN was_cli_mode INTEGER NOT NULL DEFAULT 0' },
  ];

  for (const { name, sql } of additions) {
    if (!colNames.has(name)) {
      db.exec(sql);
    }
  }
}

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    runMigration002(db);
  }
  return db;
}
