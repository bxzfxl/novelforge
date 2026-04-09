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
