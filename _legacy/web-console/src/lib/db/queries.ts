import { getDb } from './index';
import { nanoid } from 'nanoid';

// -- Config --

export function getConfig(key: string): string | undefined {
  const row = getDb()
    .prepare('SELECT value FROM config WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setConfig(key: string, value: string, encrypted = false): void {
  getDb()
    .prepare(
      `INSERT INTO config (key, value, encrypted, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         encrypted = excluded.encrypted,
         updated_at = datetime('now')`,
    )
    .run(key, value, encrypted ? 1 : 0);
}

// -- Processes --

export interface ProcessRecord {
  id: string;
  cli_type: 'claude' | 'gemini';
  role: string;
  chapter_number: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  exit_code: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  output_file: string | null;
  error_message: string | null;
}

export function insertProcess(
  p: Omit<ProcessRecord, 'id'> & { id?: string },
): string {
  const id = p.id || nanoid();
  getDb()
    .prepare(
      'INSERT INTO processes (id, cli_type, role, chapter_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, p.cli_type, p.role, p.chapter_number, p.status, p.started_at);
  return id;
}

export function updateProcessStatus(
  id: string,
  status: string,
  extra?: {
    exit_code?: number;
    error_message?: string;
    completed_at?: string;
  },
): void {
  const sets = ['status = ?'];
  const vals: unknown[] = [status];
  if (extra?.exit_code !== undefined) {
    sets.push('exit_code = ?');
    vals.push(extra.exit_code);
  }
  if (extra?.error_message) {
    sets.push('error_message = ?');
    vals.push(extra.error_message);
  }
  if (extra?.completed_at) {
    sets.push('completed_at = ?');
    vals.push(extra.completed_at);
  }
  vals.push(id);
  getDb()
    .prepare(`UPDATE processes SET ${sets.join(', ')} WHERE id = ?`)
    .run(...vals);
}

export function listProcesses(status?: string): ProcessRecord[] {
  if (status) {
    return getDb()
      .prepare(
        'SELECT * FROM processes WHERE status = ? ORDER BY started_at DESC',
      )
      .all(status) as ProcessRecord[];
  }
  return getDb()
    .prepare('SELECT * FROM processes ORDER BY started_at DESC LIMIT 100')
    .all() as ProcessRecord[];
}

// -- Events --

export function insertEvent(
  type: string,
  message: string,
  details?: object,
  chapterNumber?: number,
): void {
  getDb()
    .prepare(
      'INSERT INTO events (type, message, details, chapter_number) VALUES (?, ?, ?, ?)',
    )
    .run(
      type,
      message,
      details ? JSON.stringify(details) : null,
      chapterNumber ?? null,
    );
}

export function listEvents(
  limit = 50,
): Array<{
  id: number;
  type: string;
  message: string;
  details: string | null;
  chapter_number: number | null;
  timestamp: string;
}> {
  return getDb()
    .prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as Array<{
    id: number;
    type: string;
    message: string;
    details: string | null;
    chapter_number: number | null;
    timestamp: string;
  }>;
}

// -- Token Usage --

export function insertTokenUsage(usage: {
  process_id: string;
  cli_type: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  chapter_number?: number;
  role?: string;
}): void {
  getDb()
    .prepare(
      'INSERT INTO token_usage (process_id, cli_type, model, input_tokens, output_tokens, chapter_number, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      usage.process_id,
      usage.cli_type,
      usage.model ?? null,
      usage.input_tokens,
      usage.output_tokens,
      usage.chapter_number ?? null,
      usage.role ?? null,
    );
}

export function getTokenSummary(): {
  total_input: number;
  total_output: number;
  total: number;
} {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(SUM(input_tokens), 0) as total_input, COALESCE(SUM(output_tokens), 0) as total_output FROM token_usage',
    )
    .get() as { total_input: number; total_output: number };
  return {
    total_input: row.total_input,
    total_output: row.total_output,
    total: row.total_input + row.total_output,
  };
}

// -- Chapters --

export function listChapters(
  volume?: number,
): Array<{
  chapter_number: number;
  volume: number;
  title: string | null;
  chapter_type: string;
  word_count: number | null;
  status: string;
}> {
  if (volume) {
    return getDb()
      .prepare(
        'SELECT * FROM chapters WHERE volume = ? ORDER BY chapter_number',
      )
      .all(volume) as Array<{
      chapter_number: number;
      volume: number;
      title: string | null;
      chapter_type: string;
      word_count: number | null;
      status: string;
    }>;
  }
  return getDb()
    .prepare('SELECT * FROM chapters ORDER BY chapter_number')
    .all() as Array<{
    chapter_number: number;
    volume: number;
    title: string | null;
    chapter_type: string;
    word_count: number | null;
    status: string;
  }>;
}

// -- Checkpoints --

export function listCheckpoints(): Array<{
  id: string;
  volume: number;
  chapter_number: number;
  status: string;
  created_at: string;
}> {
  return getDb()
    .prepare('SELECT * FROM checkpoints ORDER BY created_at DESC')
    .all() as Array<{
    id: string;
    volume: number;
    chapter_number: number;
    status: string;
    created_at: string;
  }>;
}

// ── Types (mirror DB schema) ──────────────────────────────

export interface ModelTargetRow {
  id: string;
  model_id: string;
  provider: string;
  mode: 'api' | 'cli';
  display_name: string;
  description: string | null;
  input_price_per_1m: number | null;
  output_price_per_1m: number | null;
  cache_read_price_per_1m: number | null;
  cache_write_5m_price_per_1m: number | null;
  cache_write_1h_price_per_1m: number | null;
  context_window: number | null;
  max_output_tokens: number | null;
  available: number;
  availability_reason: string | null;
  last_checked_at: string | null;
  tier: 'flagship' | 'mid' | 'efficient' | 'reasoning' | null;
  price_manually_edited: number;
  created_at: string;
  updated_at: string;
}

export interface AiOperationRow {
  id: string;
  category: string;
  display_name: string;
  description: string;
  recommended_tier: string | null;
  recommended_rationale: string | null;
  is_enabled: number;
  sort_order: number;
  created_at: string;
}

// ── Model targets ──────────────────────────────

export function listModelTargets(): ModelTargetRow[] {
  return getDb()
    .prepare('SELECT * FROM model_targets ORDER BY provider, mode, tier')
    .all() as ModelTargetRow[];
}

export function getModelTarget(id: string): ModelTargetRow | undefined {
  return getDb()
    .prepare('SELECT * FROM model_targets WHERE id = ?')
    .get(id) as ModelTargetRow | undefined;
}

export function updateTargetAvailability(
  id: string,
  available: boolean,
  reason: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE model_targets
       SET available = ?, availability_reason = ?, last_checked_at = datetime('now')
       WHERE id = ?`,
    )
    .run(available ? 1 : 0, reason, id);
}

export function updateTargetPricing(
  id: string,
  pricing: {
    input_price_per_1m: number | null;
    output_price_per_1m: number | null;
    cache_read_price_per_1m: number | null;
  },
  manuallyEdited = true,
): void {
  getDb()
    .prepare(
      `UPDATE model_targets
       SET input_price_per_1m = ?, output_price_per_1m = ?, cache_read_price_per_1m = ?,
           price_manually_edited = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      pricing.input_price_per_1m,
      pricing.output_price_per_1m,
      pricing.cache_read_price_per_1m,
      manuallyEdited ? 1 : 0,
      id,
    );
}

// ── AI operations ──────────────────────────────

export function listOperations(): AiOperationRow[] {
  return getDb()
    .prepare('SELECT * FROM ai_operations ORDER BY sort_order')
    .all() as AiOperationRow[];
}

export function getOperation(id: string): AiOperationRow | undefined {
  return getDb()
    .prepare('SELECT * FROM ai_operations WHERE id = ?')
    .get(id) as AiOperationRow | undefined;
}

export function setOperationEnabled(id: string, enabled: boolean): void {
  getDb()
    .prepare('UPDATE ai_operations SET is_enabled = ? WHERE id = ?')
    .run(enabled ? 1 : 0, id);
}

// ── Bindings ──────────────────────────────

export function getCategoryDefault(category: string): string | undefined {
  const row = getDb()
    .prepare('SELECT target_id FROM operation_category_defaults WHERE category = ?')
    .get(category) as { target_id: string } | undefined;
  return row?.target_id;
}

export function setCategoryDefault(category: string, targetId: string): void {
  getDb()
    .prepare(
      `INSERT INTO operation_category_defaults (category, target_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(category) DO UPDATE SET target_id = excluded.target_id, updated_at = excluded.updated_at`,
    )
    .run(category, targetId);
}

export function clearCategoryDefault(category: string): void {
  getDb().prepare('DELETE FROM operation_category_defaults WHERE category = ?').run(category);
}

export function getOperationOverride(operationId: string): string | undefined {
  const row = getDb()
    .prepare('SELECT target_id FROM operation_overrides WHERE operation_id = ?')
    .get(operationId) as { target_id: string } | undefined;
  return row?.target_id;
}

export function setOperationOverride(operationId: string, targetId: string): void {
  getDb()
    .prepare(
      `INSERT INTO operation_overrides (operation_id, target_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(operation_id) DO UPDATE SET target_id = excluded.target_id, updated_at = excluded.updated_at`,
    )
    .run(operationId, targetId);
}

export function clearOperationOverride(operationId: string): void {
  getDb().prepare('DELETE FROM operation_overrides WHERE operation_id = ?').run(operationId);
}

// ── Budget config ──────────────────────────────

export interface BudgetConfigRow {
  id: number;
  daily_budget_usd: number;
  warn_threshold_pct: number;
  soft_block_threshold_pct: number;
  hard_block_threshold_pct: number;
  fallback_target_id: string | null;
  updated_at: string;
}

export function getBudgetConfig(): BudgetConfigRow {
  const row = getDb()
    .prepare('SELECT * FROM budget_config WHERE id = 1')
    .get() as BudgetConfigRow | undefined;
  if (!row) {
    // Initialize default row
    getDb()
      .prepare(
        `INSERT INTO budget_config (id, daily_budget_usd, warn_threshold_pct,
           soft_block_threshold_pct, hard_block_threshold_pct)
         VALUES (1, 0, 80, 100, 120)`,
      )
      .run();
    return getDb()
      .prepare('SELECT * FROM budget_config WHERE id = 1')
      .get() as BudgetConfigRow;
  }
  return row;
}

export function updateBudgetConfig(patch: Partial<Omit<BudgetConfigRow, 'id' | 'updated_at'>>): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  getDb()
    .prepare(`UPDATE budget_config SET ${fields.join(', ')} WHERE id = 1`)
    .run(...values);
}

/** Total cost incurred today (UTC day boundary based on server local time) */
export function getTodayCost(): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(cost_usd), 0) as total
       FROM token_usage
       WHERE date(timestamp) = date('now')`,
    )
    .get() as { total: number };
  return row.total;
}

// ── Pipeline snapshots ──────────────────────────────

export interface PipelineSnapshotRow {
  id: string;
  timestamp: string;
  operation_id: string;
  attempted_target_id: string;
  failure_category: 'transient' | 'permanent' | 'unknown';
  failure_message: string;
  payload_file_path: string;
  ai_summary: string | null;
  resume_hint: string | null;
  status: 'pending' | 'resumed' | 'abandoned';
  resumed_at: string | null;
  created_at: string;
}

export function insertSnapshot(row: Omit<PipelineSnapshotRow, 'created_at'>): void {
  getDb()
    .prepare(
      `INSERT INTO pipeline_snapshots (
         id, timestamp, operation_id, attempted_target_id,
         failure_category, failure_message, payload_file_path,
         ai_summary, resume_hint, status, resumed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.timestamp,
      row.operation_id,
      row.attempted_target_id,
      row.failure_category,
      row.failure_message,
      row.payload_file_path,
      row.ai_summary,
      row.resume_hint,
      row.status,
      row.resumed_at,
    );
}

export function listSnapshots(statusFilter?: PipelineSnapshotRow['status']): PipelineSnapshotRow[] {
  const db = getDb();
  if (statusFilter) {
    return db
      .prepare('SELECT * FROM pipeline_snapshots WHERE status = ? ORDER BY timestamp DESC')
      .all(statusFilter) as PipelineSnapshotRow[];
  }
  return db
    .prepare('SELECT * FROM pipeline_snapshots ORDER BY timestamp DESC')
    .all() as PipelineSnapshotRow[];
}

export function getSnapshot(id: string): PipelineSnapshotRow | undefined {
  return getDb()
    .prepare('SELECT * FROM pipeline_snapshots WHERE id = ?')
    .get(id) as PipelineSnapshotRow | undefined;
}

export function updateSnapshotStatus(
  id: string,
  status: PipelineSnapshotRow['status'],
  resumedAt?: string,
): void {
  getDb()
    .prepare(
      'UPDATE pipeline_snapshots SET status = ?, resumed_at = ? WHERE id = ?',
    )
    .run(status, resumedAt ?? null, id);
}

// ── Enhanced token_usage insertion ──────────────────────────────

export interface TokenUsageInsert {
  process_id?: string;
  cli_type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  target_id: string;
  operation_id: string;
  cost_usd: number;
  was_cli_mode: boolean;
  chapter_number?: number;
  role?: string;
}

export function insertTokenUsageV2(row: TokenUsageInsert): void {
  getDb()
    .prepare(
      `INSERT INTO token_usage (
         process_id, cli_type, model, input_tokens, output_tokens,
         cache_read_tokens, cache_write_tokens, target_id, operation_id,
         cost_usd, was_cli_mode, chapter_number, role
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.process_id ?? null,
      row.cli_type,
      row.model,
      row.input_tokens,
      row.output_tokens,
      row.cache_read_tokens ?? 0,
      row.cache_write_tokens ?? 0,
      row.target_id,
      row.operation_id,
      row.cost_usd,
      row.was_cli_mode ? 1 : 0,
      row.chapter_number ?? null,
      row.role ?? null,
    );
}

// ── Usage analytics ──────────────────────────────

export interface UsageSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  cliSavedMonth: number;
}

export function getUsageSummary(): UsageSummary {
  const db = getDb();
  const today = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE date(timestamp) = date('now')`)
    .get() as { t: number }).t;
  const week = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE timestamp >= datetime('now', '-7 days')`)
    .get() as { t: number }).t;
  const month = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage WHERE timestamp >= datetime('now', '-30 days')`)
    .get() as { t: number }).t;
  const total = (db
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as t FROM token_usage`)
    .get() as { t: number }).t;

  // CLI 节省估算：对 CLI 模式行，计算若走 API 的等效费用
  const cliSavedMonth = (db
    .prepare(
      `SELECT COALESCE(SUM(
         CASE
           WHEN mt_api.input_price_per_1m IS NOT NULL
           THEN (tu.input_tokens * mt_api.input_price_per_1m / 1000000.0) +
                (tu.output_tokens * mt_api.output_price_per_1m / 1000000.0)
           ELSE 0
         END
       ), 0) as saved
       FROM token_usage tu
       LEFT JOIN model_targets mt ON tu.target_id = mt.id
       LEFT JOIN model_targets mt_api ON mt.model_id = mt_api.model_id AND mt_api.mode = 'api'
       WHERE tu.was_cli_mode = 1 AND tu.timestamp >= datetime('now', '-30 days')`,
    )
    .get() as { saved: number }).saved;

  return { today, week, month, total, cliSavedMonth };
}

export interface OperationBreakdownRow {
  operation_id: string;
  calls: number;
  total_input: number;
  total_output: number;
  total_cost: number;
}

export function getUsageByOperation(days = 30): OperationBreakdownRow[] {
  return getDb()
    .prepare(
      `SELECT operation_id,
              COUNT(*) as calls,
              SUM(input_tokens) as total_input,
              SUM(output_tokens) as total_output,
              SUM(cost_usd) as total_cost
       FROM token_usage
       WHERE operation_id IS NOT NULL AND timestamp >= datetime('now', ?)
       GROUP BY operation_id
       ORDER BY total_cost DESC`,
    )
    .all(`-${days} days`) as OperationBreakdownRow[];
}

export interface UsageByModelRow {
  target_id: string;
  calls: number;
  total_cost: number;
}

export function getUsageByModel(days = 30): UsageByModelRow[] {
  return getDb()
    .prepare(
      `SELECT target_id, COUNT(*) as calls, SUM(cost_usd) as total_cost
       FROM token_usage
       WHERE target_id IS NOT NULL AND timestamp >= datetime('now', ?)
       GROUP BY target_id
       ORDER BY total_cost DESC`,
    )
    .all(`-${days} days`) as UsageByModelRow[];
}

export interface TimeSeriesRow {
  day: string;
  total_cost: number;
  total_calls: number;
  total_tokens: number;
}

export function getUsageTimeseries(days = 30): TimeSeriesRow[] {
  return getDb()
    .prepare(
      `SELECT date(timestamp) as day,
              SUM(cost_usd) as total_cost,
              COUNT(*) as total_calls,
              SUM(input_tokens + output_tokens) as total_tokens
       FROM token_usage
       WHERE timestamp >= datetime('now', ?)
       GROUP BY day
       ORDER BY day`,
    )
    .all(`-${days} days`) as TimeSeriesRow[];
}
