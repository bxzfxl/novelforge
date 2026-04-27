-- Migration 002: AI Operations + Model Targets + Budget + Snapshots

-- ① Model targets (model × mode combinations)
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

-- ② AI operations
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

-- ③ Category-level defaults
CREATE TABLE IF NOT EXISTS operation_category_defaults (
  category TEXT PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ④ Operation-level overrides
CREATE TABLE IF NOT EXISTS operation_overrides (
  operation_id TEXT PRIMARY KEY REFERENCES ai_operations(id),
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑤ Budget config (single row)
CREATE TABLE IF NOT EXISTS budget_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL DEFAULT 0,
  warn_threshold_pct INTEGER NOT NULL DEFAULT 80,
  soft_block_threshold_pct INTEGER NOT NULL DEFAULT 100,
  hard_block_threshold_pct INTEGER NOT NULL DEFAULT 120,
  fallback_target_id TEXT REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑥ Pipeline snapshots
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

-- ⑦ Extend token_usage with cost tracking
ALTER TABLE token_usage ADD COLUMN target_id TEXT REFERENCES model_targets(id);
ALTER TABLE token_usage ADD COLUMN operation_id TEXT REFERENCES ai_operations(id);
ALTER TABLE token_usage ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN was_cli_mode INTEGER NOT NULL DEFAULT 0;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_operation_id ON token_usage(operation_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_target_id ON token_usage(target_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON pipeline_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_operations_category ON ai_operations(category);
