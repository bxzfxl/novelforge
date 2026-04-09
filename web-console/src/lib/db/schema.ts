export const SCHEMA = `
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  cli_type TEXT NOT NULL CHECK(cli_type IN ('claude', 'gemini')),
  role TEXT NOT NULL,
  chapter_number INTEGER,
  status TEXT NOT NULL CHECK(status IN ('starting', 'running', 'completed', 'failed', 'killed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  exit_code INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  output_file TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapters (
  chapter_number INTEGER PRIMARY KEY,
  volume INTEGER NOT NULL,
  title TEXT,
  chapter_type TEXT NOT NULL CHECK(chapter_type IN ('daily', 'plot_advance', 'climax', 'foreshadow_resolve')),
  word_count INTEGER,
  status TEXT NOT NULL CHECK(status IN ('planned', 'in_progress', 'completed', 'revision')),
  writers_room_config TEXT,
  total_tokens INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  volume INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'revision_requested', 'rollback')),
  report_path TEXT NOT NULL,
  human_decision TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id TEXT REFERENCES processes(id),
  cli_type TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  chapter_number INTEGER,
  role TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('pipeline', 'writers_room', 'lore_update', 'checkpoint', 'error', 'system')),
  message TEXT NOT NULL,
  details TEXT,
  chapter_number INTEGER,
  timestamp TEXT DEFAULT (datetime('now'))
);
`;
