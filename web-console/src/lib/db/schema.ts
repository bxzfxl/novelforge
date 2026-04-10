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
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  target_id TEXT,
  operation_id TEXT,
  cost_usd REAL NOT NULL DEFAULT 0,
  was_cli_mode INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS model_targets (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('api', 'cli')),
  display_name TEXT NOT NULL,
  description TEXT,
  input_price_per_1m REAL,
  output_price_per_1m REAL,
  cache_read_price_per_1m REAL,
  cache_write_5m_price_per_1m REAL,
  cache_write_1h_price_per_1m REAL,
  context_window INTEGER,
  max_output_tokens INTEGER,
  available INTEGER NOT NULL DEFAULT 0,
  availability_reason TEXT,
  last_checked_at TEXT,
  tier TEXT CHECK(tier IN ('flagship','mid','efficient','reasoning')),
  price_manually_edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_operations (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_tier TEXT,
  recommended_rationale TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operation_category_defaults (
  category TEXT PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operation_overrides (
  operation_id TEXT PRIMARY KEY REFERENCES ai_operations(id),
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budget_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL DEFAULT 0,
  warn_threshold_pct INTEGER NOT NULL DEFAULT 80,
  soft_block_threshold_pct INTEGER NOT NULL DEFAULT 100,
  hard_block_threshold_pct INTEGER NOT NULL DEFAULT 120,
  fallback_target_id TEXT REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  attempted_target_id TEXT NOT NULL,
  failure_category TEXT NOT NULL CHECK(failure_category IN ('transient','permanent','unknown')),
  failure_message TEXT NOT NULL,
  payload_file_path TEXT NOT NULL,
  ai_summary TEXT,
  resume_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resumed','abandoned')),
  resumed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_token_usage_operation_id ON token_usage(operation_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_target_id ON token_usage(target_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON pipeline_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_operations_category ON ai_operations(category);
`;
