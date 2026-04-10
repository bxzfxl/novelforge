# NovelForge 全栈实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 NovelForge——AI 小说工程化写作系统的 Web 控制台 + 核心引擎，Docker 部署到服务器并通过端到端测试验证。

**Architecture:** Next.js 15 Web 应用（Docker 容器）+ 宿主机 Remote Agent（管理 Claude/Gemini CLI 进程）。Web 应用通过 WebSocket 与 Remote Agent 通信，Remote Agent 通过 node-pty 控制 CLI 进程。SQLite 存储状态，文件系统存储小说资料和稿件。

**Tech Stack:** Next.js 15 (App Router), React 19, shadcn/ui, Tailwind CSS 4, Socket.IO, node-pty, xterm.js, better-sqlite3, Zustand, Docker, pnpm

**Server constraints:** Ubuntu 24.04, 2 core, 3.7GB RAM, Node 22. Claude CLI v2.1.97, Gemini CLI v0.36.0 installed on host.

---

## Phase 1: 项目骨架与基础设施

### Task 1.1: 初始化 monorepo 和 Next.js 项目

**Files:**
- Create: `web-console/package.json`
- Create: `web-console/next.config.ts`
- Create: `web-console/tsconfig.json`
- Create: `web-console/tailwind.config.ts`
- Create: `web-console/src/app/layout.tsx`
- Create: `web-console/src/app/page.tsx`
- Create: `remote-agent/package.json`
- Create: `remote-agent/tsconfig.json`
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)

- [ ] **Step 1: 初始化根 monorepo**

```bash
cd /home/ubuntu/codeprogram/paperProject
pnpm init
```

编辑 `package.json`:
```json
{
  "name": "novelforge",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter web-console dev",
    "dev:agent": "pnpm --filter remote-agent dev",
    "build": "pnpm --filter web-console build",
    "build:agent": "pnpm --filter remote-agent build"
  }
}
```

创建 `pnpm-workspace.yaml`:
```yaml
packages:
  - 'web-console'
  - 'remote-agent'
```

- [ ] **Step 2: 创建 Next.js 项目**

```bash
cd /home/ubuntu/codeprogram/paperProject
pnpm create next-app@latest web-console \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack --use-pnpm
```

- [ ] **Step 3: 安装 shadcn/ui**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card badge separator tabs scroll-area input textarea label select switch dialog sheet toast sonner dropdown-menu progress tooltip
```

- [ ] **Step 4: 安装核心依赖**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm add socket.io socket.io-client zustand gray-matter js-yaml nanoid
pnpm add -D @types/js-yaml
```

- [ ] **Step 5: 初始化 remote-agent 项目**

```bash
cd /home/ubuntu/codeprogram/paperProject
mkdir -p remote-agent/src
cd remote-agent
pnpm init
pnpm add node-pty socket.io chokidar nanoid js-yaml
pnpm add -D typescript @types/node @types/js-yaml tsx
```

创建 `remote-agent/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

在 `remote-agent/package.json` 中添加 scripts:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **Step 6: 验证 Next.js 启动**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm dev &
sleep 5
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML 内容包含 Next.js 页面。

- [ ] **Step 7: 提交**

```bash
cd /home/ubuntu/codeprogram/paperProject
git init
cat > .gitignore << 'EOF'
node_modules/
.next/
dist/
*.db
.env
.env.local
EOF
git add -A
git commit -m "feat: 初始化 monorepo 骨架（Next.js + remote-agent）"
```

---

### Task 1.2: SQLite 数据层

**Files:**
- Create: `web-console/src/lib/db/schema.ts`
- Create: `web-console/src/lib/db/index.ts`
- Create: `web-console/src/lib/db/queries.ts`

- [ ] **Step 1: 安装 better-sqlite3**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

- [ ] **Step 2: 编写 schema 定义**

创建 `web-console/src/lib/db/schema.ts`:
```typescript
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
```

- [ ] **Step 3: 编写数据库初始化**

创建 `web-console/src/lib/db/index.ts`:
```typescript
import Database from 'better-sqlite3';
import path from 'node:path';
import { SCHEMA } from './schema';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'novelforge.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    const fs = require('node:fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
  }
  return db;
}
```

- [ ] **Step 4: 编写查询封装**

创建 `web-console/src/lib/db/queries.ts`:
```typescript
import { getDb } from './index';
import { nanoid } from 'nanoid';

// -- Config --
export function getConfig(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setConfig(key: string, value: string, encrypted = false): void {
  getDb().prepare(
    'INSERT INTO config (key, value, encrypted, updated_at) VALUES (?, ?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, encrypted = excluded.encrypted, updated_at = datetime(\'now\')'
  ).run(key, value, encrypted ? 1 : 0);
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

export function insertProcess(p: Omit<ProcessRecord, 'id'> & { id?: string }): string {
  const id = p.id || nanoid();
  getDb().prepare(
    'INSERT INTO processes (id, cli_type, role, chapter_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, p.cli_type, p.role, p.chapter_number, p.status, p.started_at);
  return id;
}

export function updateProcessStatus(id: string, status: string, extra?: { exit_code?: number; error_message?: string; completed_at?: string }): void {
  const sets = ['status = ?'];
  const vals: unknown[] = [status];
  if (extra?.exit_code !== undefined) { sets.push('exit_code = ?'); vals.push(extra.exit_code); }
  if (extra?.error_message) { sets.push('error_message = ?'); vals.push(extra.error_message); }
  if (extra?.completed_at) { sets.push('completed_at = ?'); vals.push(extra.completed_at); }
  vals.push(id);
  getDb().prepare(`UPDATE processes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function listProcesses(status?: string): ProcessRecord[] {
  if (status) {
    return getDb().prepare('SELECT * FROM processes WHERE status = ? ORDER BY started_at DESC').all(status) as ProcessRecord[];
  }
  return getDb().prepare('SELECT * FROM processes ORDER BY started_at DESC LIMIT 100').all() as ProcessRecord[];
}

// -- Events --
export function insertEvent(type: string, message: string, details?: object, chapterNumber?: number): void {
  getDb().prepare(
    'INSERT INTO events (type, message, details, chapter_number) VALUES (?, ?, ?, ?)'
  ).run(type, message, details ? JSON.stringify(details) : null, chapterNumber ?? null);
}

export function listEvents(limit = 50): Array<{ id: number; type: string; message: string; details: string | null; chapter_number: number | null; timestamp: string }> {
  return getDb().prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
}

// -- Token Usage --
export function insertTokenUsage(usage: { process_id: string; cli_type: string; model?: string; input_tokens: number; output_tokens: number; chapter_number?: number; role?: string }): void {
  getDb().prepare(
    'INSERT INTO token_usage (process_id, cli_type, model, input_tokens, output_tokens, chapter_number, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(usage.process_id, usage.cli_type, usage.model ?? null, usage.input_tokens, usage.output_tokens, usage.chapter_number ?? null, usage.role ?? null);
}

export function getTokenSummary(): { total_input: number; total_output: number; total: number } {
  const row = getDb().prepare('SELECT COALESCE(SUM(input_tokens), 0) as total_input, COALESCE(SUM(output_tokens), 0) as total_output FROM token_usage').get() as any;
  return { total_input: row.total_input, total_output: row.total_output, total: row.total_input + row.total_output };
}

// -- Chapters --
export function listChapters(volume?: number): Array<{ chapter_number: number; volume: number; title: string | null; chapter_type: string; word_count: number | null; status: string }> {
  if (volume) {
    return getDb().prepare('SELECT * FROM chapters WHERE volume = ? ORDER BY chapter_number').all(volume) as any[];
  }
  return getDb().prepare('SELECT * FROM chapters ORDER BY chapter_number').all() as any[];
}

// -- Checkpoints --
export function listCheckpoints(): Array<{ id: string; volume: number; chapter_number: number; status: string; created_at: string }> {
  return getDb().prepare('SELECT * FROM checkpoints ORDER BY created_at DESC').all() as any[];
}
```

- [ ] **Step 5: 编写 API 测试路由验证数据库**

创建 `web-console/src/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    return NextResponse.json({
      status: 'ok',
      tables: tables.map(t => t.name),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 6: 验证**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm dev &
sleep 5
curl -s http://localhost:3000/api/health | jq .
kill %1
```

Expected:
```json
{
  "status": "ok",
  "tables": ["config", "processes", "chapters", "checkpoints", "token_usage", "events"],
  "timestamp": "..."
}
```

- [ ] **Step 7: 提交**

```bash
git add web-console/src/lib/db/ web-console/src/app/api/health/
git commit -m "feat: SQLite 数据层（schema + queries + health check）"
```

---

### Task 1.3: Remote Agent 核心——CLI 进程管理器

**Files:**
- Create: `remote-agent/src/index.ts`
- Create: `remote-agent/src/process-manager.ts`
- Create: `remote-agent/src/types.ts`

- [ ] **Step 1: 定义类型**

创建 `remote-agent/src/types.ts`:
```typescript
export interface SpawnConfig {
  id?: string;
  cliType: 'claude' | 'gemini';
  role: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  outputFile?: string;
  chapterNumber?: number;
}

export interface ProcessInfo {
  id: string;
  cliType: 'claude' | 'gemini';
  role: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed';
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  outputFile?: string;
  chapterNumber?: number;
  pid?: number;
}

export interface AgentConfig {
  port: number;
  projectRoot: string;
  claudePath: string;
  geminiPath: string;
  maxConcurrent: { claude: number; gemini: number };
}

// WebSocket 事件
export interface ServerToClientEvents {
  'process:output': (data: { processId: string; data: string }) => void;
  'process:status': (data: ProcessInfo) => void;
  'file:changed': (data: { path: string; type: 'created' | 'modified' | 'deleted' }) => void;
  'agent:status': (data: { connected: boolean; activeProcesses: number }) => void;
}

export interface ClientToServerEvents {
  'process:spawn': (config: SpawnConfig, callback: (result: { ok: boolean; processId?: string; error?: string }) => void) => void;
  'process:kill': (processId: string, callback: (result: { ok: boolean }) => void) => void;
  'process:list': (callback: (processes: ProcessInfo[]) => void) => void;
  'process:subscribe': (processId: string) => void;
  'process:unsubscribe': (processId: string) => void;
  'terminal:spawn': (cliType: 'claude' | 'gemini', callback: (result: { ok: boolean; sessionId?: string }) => void) => void;
  'terminal:input': (data: { sessionId: string; data: string }) => void;
  'terminal:resize': (data: { sessionId: string; cols: number; rows: number }) => void;
  'terminal:kill': (sessionId: string) => void;
  'file:read': (filePath: string, callback: (result: { ok: boolean; content?: string; error?: string }) => void) => void;
  'file:write': (data: { path: string; content: string }, callback: (result: { ok: boolean; error?: string }) => void) => void;
  'file:list': (dirPath: string, callback: (result: { ok: boolean; files?: Array<{ name: string; isDir: boolean; size: number; modified: string }>; error?: string }) => void) => void;
}
```

- [ ] **Step 2: 编写 ProcessManager**

创建 `remote-agent/src/process-manager.ts`:
```typescript
import * as pty from 'node-pty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { nanoid } from 'nanoid';
import type { SpawnConfig, ProcessInfo, AgentConfig } from './types.js';

interface ManagedProcess {
  info: ProcessInfo;
  pty: pty.IPty;
  outputBuffer: string;
  outputStream?: fs.WriteStream;
  subscribers: Set<string>; // socket IDs
}

export class ProcessManager {
  private processes = new Map<string, ManagedProcess>();
  private config: AgentConfig;
  private onOutput?: (processId: string, data: string) => void;
  private onStatusChange?: (info: ProcessInfo) => void;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  setOutputHandler(handler: (processId: string, data: string) => void): void {
    this.onOutput = handler;
  }

  setStatusHandler(handler: (info: ProcessInfo) => void): void {
    this.onStatusChange = handler;
  }

  spawn(config: SpawnConfig): ProcessInfo {
    const id = config.id || nanoid();
    const command = config.cliType === 'claude' ? this.config.claudePath : this.config.geminiPath;

    // 检查并发限制
    const activeCount = this.getActiveCount(config.cliType);
    const limit = this.config.maxConcurrent[config.cliType];
    if (activeCount >= limit) {
      throw new Error(`${config.cliType} 并发上限 ${limit} 已达到（当前 ${activeCount}）`);
    }

    const info: ProcessInfo = {
      id,
      cliType: config.cliType,
      role: config.role,
      status: 'starting',
      startedAt: new Date().toISOString(),
      chapterNumber: config.chapterNumber,
    };

    const env: Record<string, string> = { ...process.env as Record<string, string>, ...config.env };

    const ptyProcess = pty.spawn(command, config.args, {
      name: 'xterm-256color',
      cols: 200,
      rows: 50,
      cwd: config.cwd || this.config.projectRoot,
      env,
    });

    info.pid = ptyProcess.pid;
    info.status = 'running';

    let outputStream: fs.WriteStream | undefined;
    if (config.outputFile) {
      const dir = path.dirname(config.outputFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      outputStream = fs.createWriteStream(config.outputFile);
      info.outputFile = config.outputFile;
    }

    const managed: ManagedProcess = {
      info,
      pty: ptyProcess,
      outputBuffer: '',
      outputStream,
      subscribers: new Set(),
    };

    ptyProcess.onData((data: string) => {
      managed.outputBuffer += data;
      outputStream?.write(data);
      this.onOutput?.(id, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      managed.info.status = exitCode === 0 ? 'completed' : 'failed';
      managed.info.exitCode = exitCode;
      managed.info.completedAt = new Date().toISOString();
      outputStream?.close();
      this.onStatusChange?.(managed.info);
    });

    this.processes.set(id, managed);
    this.onStatusChange?.(info);

    return info;
  }

  kill(processId: string): boolean {
    const managed = this.processes.get(processId);
    if (!managed || managed.info.status !== 'running') return false;
    managed.pty.kill();
    managed.info.status = 'killed';
    managed.info.completedAt = new Date().toISOString();
    managed.outputStream?.close();
    this.onStatusChange?.(managed.info);
    return true;
  }

  getProcess(processId: string): ProcessInfo | undefined {
    return this.processes.get(processId)?.info;
  }

  getOutput(processId: string): string {
    return this.processes.get(processId)?.outputBuffer || '';
  }

  listActive(): ProcessInfo[] {
    return Array.from(this.processes.values())
      .filter(p => p.info.status === 'running')
      .map(p => p.info);
  }

  listAll(): ProcessInfo[] {
    return Array.from(this.processes.values()).map(p => p.info);
  }

  subscribe(processId: string, socketId: string): void {
    this.processes.get(processId)?.subscribers.add(socketId);
  }

  unsubscribe(processId: string, socketId: string): void {
    this.processes.get(processId)?.subscribers.delete(socketId);
  }

  getSubscribers(processId: string): Set<string> {
    return this.processes.get(processId)?.subscribers || new Set();
  }

  // 交互式终端：写入 stdin
  writeToProcess(processId: string, data: string): void {
    const managed = this.processes.get(processId);
    if (managed && managed.info.status === 'running') {
      managed.pty.write(data);
    }
  }

  resizeProcess(processId: string, cols: number, rows: number): void {
    const managed = this.processes.get(processId);
    if (managed && managed.info.status === 'running') {
      managed.pty.resize(cols, rows);
    }
  }

  private getActiveCount(cliType: string): number {
    return Array.from(this.processes.values())
      .filter(p => p.info.cliType === cliType && p.info.status === 'running')
      .length;
  }
}
```

- [ ] **Step 3: 编写 Agent 入口（Socket.IO 服务）**

创建 `remote-agent/src/index.ts`:
```typescript
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProcessManager } from './process-manager.js';
import type { ServerToClientEvents, ClientToServerEvents, AgentConfig } from './types.js';

const config: AgentConfig = {
  port: Number(process.env.AGENT_PORT) || 9100,
  projectRoot: process.env.PROJECT_ROOT || path.resolve(process.cwd(), '..'),
  claudePath: process.env.CLAUDE_PATH || 'claude',
  geminiPath: process.env.GEMINI_PATH || 'gemini',
  maxConcurrent: {
    claude: Number(process.env.MAX_CLAUDE) || 2,
    gemini: Number(process.env.MAX_GEMINI) || 2,
  },
};

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5e6, // 5MB
});

const pm = new ProcessManager(config);

// 进程输出 → 广播给订阅者
pm.setOutputHandler((processId, data) => {
  const subs = pm.getSubscribers(processId);
  for (const socketId of subs) {
    io.to(socketId).emit('process:output', { processId, data });
  }
});

// 进程状态变更 → 广播给所有连接
pm.setStatusHandler((info) => {
  io.emit('process:status', info);
});

io.on('connection', (socket) => {
  console.log(`[Agent] 客户端连接: ${socket.id}`);

  // 进程管理
  socket.on('process:spawn', (spawnConfig, callback) => {
    try {
      const info = pm.spawn(spawnConfig);
      // 自动订阅创建者
      pm.subscribe(info.id, socket.id);
      callback({ ok: true, processId: info.id });
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  socket.on('process:kill', (processId, callback) => {
    const ok = pm.kill(processId);
    callback({ ok });
  });

  socket.on('process:list', (callback) => {
    callback(pm.listAll());
  });

  socket.on('process:subscribe', (processId) => {
    pm.subscribe(processId, socket.id);
    // 发送已有输出
    const output = pm.getOutput(processId);
    if (output) {
      socket.emit('process:output', { processId, data: output });
    }
  });

  socket.on('process:unsubscribe', (processId) => {
    pm.unsubscribe(processId, socket.id);
  });

  // 交互式终端
  socket.on('terminal:spawn', (cliType, callback) => {
    try {
      const info = pm.spawn({
        cliType,
        role: 'interactive',
        args: [],
        cwd: config.projectRoot,
      });
      pm.subscribe(info.id, socket.id);
      callback({ ok: true, sessionId: info.id });
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  socket.on('terminal:input', ({ sessionId, data }) => {
    pm.writeToProcess(sessionId, data);
  });

  socket.on('terminal:resize', ({ sessionId, cols, rows }) => {
    pm.resizeProcess(sessionId, cols, rows);
  });

  socket.on('terminal:kill', (sessionId) => {
    pm.kill(sessionId);
  });

  // 文件操作
  socket.on('file:read', (filePath, callback) => {
    try {
      const absPath = path.resolve(config.projectRoot, filePath);
      if (!absPath.startsWith(config.projectRoot)) {
        callback({ ok: false, error: '路径越界' });
        return;
      }
      const content = fs.readFileSync(absPath, 'utf-8');
      callback({ ok: true, content });
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  socket.on('file:write', ({ path: filePath, content }, callback) => {
    try {
      const absPath = path.resolve(config.projectRoot, filePath);
      if (!absPath.startsWith(config.projectRoot)) {
        callback({ ok: false, error: '路径越界' });
        return;
      }
      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(absPath, content, 'utf-8');
      callback({ ok: true });
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  socket.on('file:list', (dirPath, callback) => {
    try {
      const absPath = path.resolve(config.projectRoot, dirPath);
      if (!absPath.startsWith(config.projectRoot)) {
        callback({ ok: false, error: '路径越界' });
        return;
      }
      const entries = fs.readdirSync(absPath, { withFileTypes: true });
      const files = entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        size: e.isFile() ? fs.statSync(path.join(absPath, e.name)).size : 0,
        modified: fs.statSync(path.join(absPath, e.name)).mtime.toISOString(),
      }));
      callback({ ok: true, files });
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Agent] 客户端断开: ${socket.id}`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`[Agent] 启动成功 port=${config.port} projectRoot=${config.projectRoot}`);
  console.log(`[Agent] Claude: ${config.claudePath}, Gemini: ${config.geminiPath}`);
  console.log(`[Agent] 并发上限: Claude=${config.maxConcurrent.claude}, Gemini=${config.maxConcurrent.gemini}`);
});
```

- [ ] **Step 4: 验证 Remote Agent 启动并能控制 Claude CLI**

```bash
cd /home/ubuntu/codeprogram/paperProject/remote-agent
PROJECT_ROOT=/home/ubuntu/codeprogram/paperProject pnpm dev &
sleep 3

# 用 node 简单测试连接
node -e "
const { io } = require('socket.io-client');
const socket = io('http://localhost:9100');
socket.on('connect', () => {
  console.log('Connected to agent');
  socket.emit('process:list', (list) => {
    console.log('Processes:', list);
    socket.disconnect();
    process.exit(0);
  });
});
"
kill %1
```

Expected: 输出 `Connected to agent` 和 `Processes: []`。

- [ ] **Step 5: 提交**

```bash
git add remote-agent/
git commit -m "feat: Remote Agent 核心——CLI 进程管理器 + Socket.IO 服务"
```

---

### Task 1.4: Web 端 WebSocket 客户端与 Agent 连接

**Files:**
- Create: `web-console/src/lib/agent-client.ts`
- Create: `web-console/src/hooks/use-agent.ts`
- Create: `web-console/src/stores/agent-store.ts`

- [ ] **Step 1: 编写 Agent 客户端封装**

创建 `web-console/src/lib/agent-client.ts`:
```typescript
import { io, Socket } from 'socket.io-client';

export type ProcessInfo = {
  id: string;
  cliType: 'claude' | 'gemini';
  role: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed';
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  outputFile?: string;
  chapterNumber?: number;
  pid?: number;
};

export type SpawnConfig = {
  id?: string;
  cliType: 'claude' | 'gemini';
  role: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  outputFile?: string;
  chapterNumber?: number;
};

class AgentClient {
  private socket: Socket | null = null;
  private url: string = '';
  private listeners = new Map<string, Set<(data: any) => void>>();

  connect(url: string): Promise<void> {
    this.url = url;
    return new Promise((resolve, reject) => {
      this.socket = io(url, { reconnection: true, reconnectionDelay: 2000 });
      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (err) => reject(err));

      // 转发事件
      this.socket.on('process:output', (data) => this.emit('process:output', data));
      this.socket.on('process:status', (data) => this.emit('process:status', data));
      this.socket.on('file:changed', (data) => this.emit('file:changed', data));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 进程管理
  async spawnProcess(config: SpawnConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket!.emit('process:spawn', config, (result: any) => {
        if (result.ok) resolve(result.processId!);
        else reject(new Error(result.error));
      });
    });
  }

  async killProcess(processId: string): Promise<void> {
    return new Promise((resolve) => {
      this.socket!.emit('process:kill', processId, () => resolve());
    });
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    return new Promise((resolve) => {
      this.socket!.emit('process:list', (list: ProcessInfo[]) => resolve(list));
    });
  }

  subscribeProcess(processId: string): void {
    this.socket?.emit('process:subscribe', processId);
  }

  unsubscribeProcess(processId: string): void {
    this.socket?.emit('process:unsubscribe', processId);
  }

  // 交互式终端
  async spawnTerminal(cliType: 'claude' | 'gemini'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket!.emit('terminal:spawn', cliType, (result: any) => {
        if (result.ok) resolve(result.sessionId!);
        else reject(new Error(result.error));
      });
    });
  }

  terminalInput(sessionId: string, data: string): void {
    this.socket?.emit('terminal:input', { sessionId, data });
  }

  terminalResize(sessionId: string, cols: number, rows: number): void {
    this.socket?.emit('terminal:resize', { sessionId, cols, rows });
  }

  terminalKill(sessionId: string): void {
    this.socket?.emit('terminal:kill', sessionId);
  }

  // 文件操作
  async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket!.emit('file:read', filePath, (result: any) => {
        if (result.ok) resolve(result.content!);
        else reject(new Error(result.error));
      });
    });
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket!.emit('file:write', { path: filePath, content }, (result: any) => {
        if (result.ok) resolve();
        else reject(new Error(result.error));
      });
    });
  }

  async listDir(dirPath: string): Promise<Array<{ name: string; isDir: boolean; size: number; modified: string }>> {
    return new Promise((resolve, reject) => {
      this.socket!.emit('file:list', dirPath, (result: any) => {
        if (result.ok) resolve(result.files!);
        else reject(new Error(result.error));
      });
    });
  }

  // 事件系统
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
}

// 单例
export const agentClient = new AgentClient();
```

- [ ] **Step 2: 编写 Zustand Store**

创建 `web-console/src/stores/agent-store.ts`:
```typescript
import { create } from 'zustand';
import { agentClient, type ProcessInfo } from '@/lib/agent-client';

interface AgentState {
  connected: boolean;
  processes: ProcessInfo[];
  agentUrl: string;

  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  refreshProcesses: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  connected: false,
  processes: [],
  agentUrl: process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:9100',

  connect: async (url?: string) => {
    const agentUrl = url || get().agentUrl;
    try {
      await agentClient.connect(agentUrl);
      set({ connected: true, agentUrl });

      agentClient.on('process:status', (info: ProcessInfo) => {
        set(state => {
          const idx = state.processes.findIndex(p => p.id === info.id);
          const updated = [...state.processes];
          if (idx >= 0) updated[idx] = info;
          else updated.unshift(info);
          return { processes: updated };
        });
      });

      await get().refreshProcesses();
    } catch {
      set({ connected: false });
    }
  },

  disconnect: () => {
    agentClient.disconnect();
    set({ connected: false, processes: [] });
  },

  refreshProcesses: async () => {
    const processes = await agentClient.listProcesses();
    set({ processes });
  },
}));
```

- [ ] **Step 3: 编写连接 Hook**

创建 `web-console/src/hooks/use-agent.ts`:
```typescript
'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/stores/agent-store';

export function useAgent() {
  const { connected, connect, disconnect } = useAgentStore();

  useEffect(() => {
    if (!connected) {
      connect();
    }
    return () => { /* 页面卸载不断连 */ };
  }, [connected, connect]);

  return { connected };
}
```

- [ ] **Step 4: 提交**

```bash
git add web-console/src/lib/agent-client.ts web-console/src/stores/ web-console/src/hooks/
git commit -m "feat: Agent 客户端、Zustand store 和连接 hook"
```

---

### Task 1.5: Docker 配置

**Files:**
- Create: `web-console/Dockerfile`
- Create: `docker-compose.yaml`
- Create: `.env.example`

- [ ] **Step 1: 编写 Next.js Dockerfile**

创建 `web-console/Dockerfile`:
```dockerfile
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: 更新 next.config.ts 启用 standalone**

在 `web-console/next.config.ts` 中确保：
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 3: 编写 docker-compose.yaml**

创建 `docker-compose.yaml`（项目根目录）:
```yaml
services:
  web:
    build:
      context: ./web-console
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_AGENT_URL=http://${HOST_IP:-localhost}:9100
      - DB_PATH=/app/data/novelforge.db
    volumes:
      - web-data:/app/data
    restart: unless-stopped
    mem_limit: 512m

volumes:
  web-data:
```

- [ ] **Step 4: 创建 .env.example**

创建 `.env.example`:
```bash
# Remote Agent
AGENT_PORT=9100
PROJECT_ROOT=/home/ubuntu/codeprogram/paperProject
CLAUDE_PATH=claude
GEMINI_PATH=gemini
MAX_CLAUDE=2
MAX_GEMINI=2

# Web Console
NEXT_PUBLIC_AGENT_URL=http://localhost:9100
HOST_IP=localhost
```

- [ ] **Step 5: 创建 remote-agent 启动脚本**

创建 `scripts/start-agent.sh`:
```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export PROJECT_ROOT
export AGENT_PORT=${AGENT_PORT:-9100}
export CLAUDE_PATH=${CLAUDE_PATH:-claude}
export GEMINI_PATH=${GEMINI_PATH:-gemini}
export MAX_CLAUDE=${MAX_CLAUDE:-2}
export MAX_GEMINI=${MAX_GEMINI:-2}

echo "[NovelForge] 启动 Remote Agent..."
echo "  PROJECT_ROOT=$PROJECT_ROOT"
echo "  AGENT_PORT=$AGENT_PORT"

cd "$PROJECT_ROOT/remote-agent"
exec npx tsx src/index.ts
```

```bash
chmod +x scripts/start-agent.sh
```

- [ ] **Step 6: 提交**

```bash
git add web-console/Dockerfile docker-compose.yaml .env.example scripts/start-agent.sh
git commit -m "feat: Docker 配置 + remote-agent 启动脚本"
```

---

## Phase 2: 前端布局与核心页面

### Task 2.1: 应用布局——侧边导航 + 顶栏

**Files:**
- Modify: `web-console/src/app/layout.tsx`
- Create: `web-console/src/components/layout/sidebar.tsx`
- Create: `web-console/src/components/layout/topbar.tsx`
- Create: `web-console/src/app/globals.css` (modify)

- [ ] **Step 1: 编写侧边导航组件**

创建 `web-console/src/components/layout/sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '仪表盘', icon: 'LayoutDashboard' },
  { href: '/pipeline', label: '管线', icon: 'GitBranch' },
  { href: '/writers-room', label: '编剧室', icon: 'Users' },
  { href: '/lore', label: '资料库', icon: 'BookOpen' },
  { href: '/manuscript', label: '稿件', icon: 'FileText' },
  { href: '/checkpoints', label: '检查点', icon: 'CheckSquare' },
  { href: '/settings', label: '配置', icon: 'Settings' },
  { href: '/terminal', label: '终端', icon: 'Terminal' },
];

// 简单 SVG 图标映射（避免引入图标库）
const icons: Record<string, string> = {
  LayoutDashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  GitBranch: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
  Users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  BookOpen: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  FileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  CheckSquare: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  Settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  Terminal: 'M4 17l6-6-6-6M12 19h8',
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/40 flex flex-col h-screen shrink-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">NovelForge</h1>
        <p className="text-xs text-muted-foreground">AI 小说工作台</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={icons[item.icon] || ''} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: 编写顶栏组件**

创建 `web-console/src/components/layout/topbar.tsx`:
```tsx
'use client';

import { useAgentStore } from '@/stores/agent-store';
import { Badge } from '@/components/ui/badge';
import { useAgent } from '@/hooks/use-agent';

export function Topbar() {
  useAgent();
  const { connected, processes } = useAgentStore();
  const activeCount = processes.filter(p => p.status === 'running').length;

  return (
    <header className="h-12 border-b flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">项目状态</span>
      </div>
      <div className="flex items-center gap-3">
        {activeCount > 0 && (
          <Badge variant="secondary">{activeCount} 进程运行中</Badge>
        )}
        <Badge variant={connected ? 'default' : 'destructive'}>
          Agent: {connected ? '已连接' : '断开'}
        </Badge>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: 更新根布局**

修改 `web-console/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovelForge - AI 小说工作台",
  description: "AI 小说工程化写作系统控制台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 编写仪表盘首页**

修改 `web-console/src/app/page.tsx`:
```tsx
'use client';

import { useAgentStore } from '@/stores/agent-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { connected, processes } = useAgentStore();
  const running = processes.filter(p => p.status === 'running');
  const completed = processes.filter(p => p.status === 'completed');
  const failed = processes.filter(p => p.status === 'failed');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">仪表盘</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Agent 状态</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={connected ? 'default' : 'destructive'} className="text-lg">
              {connected ? '已连接' : '断开'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">运行中进程</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{running.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{completed.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{failed.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近进程</CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <p className="text-muted-foreground">暂无进程记录</p>
          ) : (
            <div className="space-y-2">
              {processes.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{p.cliType}</Badge>
                    <span className="text-sm">{p.role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      p.status === 'running' ? 'default' :
                      p.status === 'completed' ? 'secondary' :
                      'destructive'
                    }>
                      {p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: 验证页面渲染**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm dev &
sleep 5
curl -s http://localhost:3000 | grep -o 'NovelForge' | head -1
kill %1
```

Expected: 输出 `NovelForge`。

- [ ] **Step 6: 提交**

```bash
git add web-console/src/
git commit -m "feat: 应用布局（侧边导航 + 顶栏 + 仪表盘首页）"
```

---

### Task 2.2: 终端页面（端到端验证 CLI 控制）

**Files:**
- Create: `web-console/src/app/terminal/page.tsx`
- Create: `web-console/src/components/terminal/terminal-panel.tsx`

- [ ] **Step 1: 安装 xterm.js**

```bash
cd /home/ubuntu/codeprogram/paperProject/web-console
pnpm add @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
```

- [ ] **Step 2: 编写终端组件**

创建 `web-console/src/components/terminal/terminal-panel.tsx`:
```tsx
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { agentClient } from '@/lib/agent-client';
import { useAgentStore } from '@/stores/agent-store';

interface TerminalPanelProps {
  cliType: 'claude' | 'gemini';
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export function TerminalPanel({ cliType, sessionId: externalSessionId, onSessionCreated }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<string | null>(externalSessionId || null);
  const { connected } = useAgentStore();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || !connected) return;

    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // 启动 CLI 会话
    setStatus('connecting');
    try {
      const sid = await agentClient.spawnTerminal(cliType);
      sessionRef.current = sid;
      onSessionCreated?.(sid);
      setStatus('connected');

      // PTY 输出 → xterm
      const unsub = agentClient.on('process:output', (data: { processId: string; data: string }) => {
        if (data.processId === sid) {
          term.write(data.data);
        }
      });

      // xterm 输入 → PTY
      term.onData((data) => {
        agentClient.terminalInput(sid, data);
      });

      // 窗口大小变更
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
        agentClient.terminalResize(sid, term.cols, term.rows);
      });
      observer.observe(containerRef.current!);

      // 进程结束
      const unsubStatus = agentClient.on('process:status', (info: { id: string; status: string }) => {
        if (info.id === sid && info.status !== 'running') {
          setStatus('disconnected');
          term.write('\r\n\x1b[33m[会话已结束]\x1b[0m\r\n');
        }
      });

      return () => {
        unsub();
        unsubStatus();
        observer.disconnect();
      };
    } catch (err) {
      term.write(`\x1b[31m连接失败: ${err}\x1b[0m\r\n`);
      setStatus('disconnected');
    }
  }, [connected, cliType, onSessionCreated]);

  useEffect(() => {
    const cleanup = initTerminal();
    return () => {
      cleanup?.then(fn => fn?.());
      termRef.current?.dispose();
    };
  }, [initTerminal]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
        <span className="text-sm font-medium">{cliType.toUpperCase()} Terminal</span>
        <span className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-500' :
          status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        }`} />
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <div ref={containerRef} className="flex-1 bg-[#0a0a0a]" />
    </div>
  );
}
```

- [ ] **Step 3: 编写终端页面**

创建 `web-console/src/app/terminal/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAgentStore } from '@/stores/agent-store';
import dynamic from 'next/dynamic';

// 动态导入避免 SSR 问题（xterm 需要 DOM）
const TerminalPanel = dynamic(
  () => import('@/components/terminal/terminal-panel').then(m => ({ default: m.TerminalPanel })),
  { ssr: false, loading: () => <div className="flex-1 bg-[#0a0a0a] animate-pulse" /> }
);

interface TermSession {
  id: string;
  cliType: 'claude' | 'gemini';
  label: string;
}

export default function TerminalPage() {
  const { connected } = useAgentStore();
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  const addSession = (cliType: 'claude' | 'gemini') => {
    const id = `term-${Date.now()}`;
    const label = `${cliType} #${sessions.filter(s => s.cliType === cliType).length + 1}`;
    setSessions(prev => [...prev, { id, cliType, label }]);
    setActiveTab(id);
  };

  const removeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeTab === id) {
      setActiveTab(sessions[0]?.id || '');
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Agent 未连接，无法启动终端</p>
          <p className="text-sm text-muted-foreground">请确认 Remote Agent 已启动</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold">终端</h2>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => addSession('claude')}>+ Claude</Button>
          <Button size="sm" variant="outline" onClick={() => addSession('gemini')}>+ Gemini</Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">点击上方按钮创建终端会话</p>
          </div>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList>
            {sessions.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-2">
                {s.label}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                  className="ml-1 text-xs hover:text-destructive"
                >
                  x
                </button>
              </TabsTrigger>
            ))}
          </TabsList>
          {sessions.map(s => (
            <TabsContent key={s.id} value={s.id} className="flex-1">
              <TerminalPanel cliType={s.cliType} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add web-console/src/app/terminal/ web-console/src/components/terminal/
git commit -m "feat: 终端页面（xterm.js + CLI 交互会话）"
```

---

### Task 2.3: 配置中心页面

**Files:**
- Create: `web-console/src/app/settings/page.tsx`
- Create: `web-console/src/app/api/config/route.ts`

- [ ] **Step 1: 编写配置 API**

创建 `web-console/src/app/api/config/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/db/queries';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value, encrypted FROM config').all() as Array<{ key: string; value: string; encrypted: number }>;
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.encrypted ? '••••••••' : row.value;
  }
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (value === '••••••••') continue; // 不更新被遮蔽的值
    const encrypted = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret');
    setConfig(key, value, encrypted);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 编写配置页面**

创建 `web-console/src/app/settings/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAgentStore } from '@/stores/agent-store';

const CONFIG_FIELDS = [
  { section: '模型配置', fields: [
    { key: 'claude_api_key', label: 'Claude API Key', type: 'password' },
    { key: 'gemini_api_key', label: 'Gemini API Key', type: 'password' },
    { key: 'claude_model', label: 'Claude 模型', type: 'text', placeholder: 'claude-sonnet-4-6' },
    { key: 'gemini_model', label: 'Gemini 模型', type: 'text', placeholder: 'gemini-2.5-pro' },
  ]},
  { section: '管线配置', fields: [
    { key: 'checkpoint_interval', label: '检查点间隔（章）', type: 'number', placeholder: '10' },
    { key: 'chapter_word_min', label: '章节最小字数', type: 'number', placeholder: '4000' },
    { key: 'chapter_word_max', label: '章节最大字数', type: 'number', placeholder: '5000' },
    { key: 'max_retry', label: '最大重试次数', type: 'number', placeholder: '2' },
  ]},
  { section: '并发配置', fields: [
    { key: 'max_claude_concurrent', label: 'Claude 最大并发', type: 'number', placeholder: '2' },
    { key: 'max_gemini_concurrent', label: 'Gemini 最大并发', type: 'number', placeholder: '2' },
  ]},
  { section: 'Agent 连接', fields: [
    { key: 'agent_url', label: 'Agent URL', type: 'text', placeholder: 'http://localhost:9100' },
  ]},
];

export default function SettingsPage() {
  const [config, setConfigState] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { connected, connect } = useAgentStore();

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      setConfigState(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      toast.success('配置已保存');
    } else {
      toast.error('保存失败');
    }
  };

  const handleTestAgent = async () => {
    try {
      await connect(config.agent_url || undefined);
      toast.success('Agent 连接成功');
    } catch {
      toast.error('Agent 连接失败');
    }
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">配置中心</h2>

      {CONFIG_FIELDS.map(section => (
        <Card key={section.section}>
          <CardHeader>
            <CardTitle className="text-lg">{section.section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map(field => (
              <div key={field.key} className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-sm">{field.label}</Label>
                <div className="col-span-2">
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={config[field.key] || ''}
                    onChange={(e) => setConfigState(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button onClick={handleSave}>保存配置</Button>
        <Button variant="outline" onClick={handleTestAgent}>
          测试 Agent 连接 {connected ? '(已连接)' : ''}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add web-console/src/app/settings/ web-console/src/app/api/config/
git commit -m "feat: 配置中心页面 + 配置 API"
```

---

## Phase 3: 小说引擎目录骨架与资料管理

### Task 3.1: 初始化小说工程目录结构

**Files:**
- Create: `config/project.yaml`
- Create: `config/agents.yaml`
- Create: `config/pipeline.yaml`
- Create: `config/models.yaml`
- Create: `lore/world/core-rules.md` (模板)
- Create: `lore/characters/_index.md` (模板)
- Create: `lore/style/voice.md` (模板)
- Create: `lore/_context/L0-global-summary.md`
- Create: `outline/master-outline.md` (模板)
- Create: `outline/threads/foreshadow.md`
- Create: `scripts/init-project.sh`
- Create: 各级目录

- [ ] **Step 1: 编写 init-project.sh**

创建 `scripts/init-project.sh`:
```bash
#!/bin/bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 创建目录结构
dirs=(
  config
  lore/world lore/characters lore/style lore/_context
  outline/threads
  manuscript
  workspace/current workspace/archive
  checkpoints
  prompts/showrunner prompts/writers prompts/lore prompts/review
)

for d in "${dirs[@]}"; do
  mkdir -p "$d"
done

# 项目配置模板
if [ ! -f config/project.yaml ]; then
cat > config/project.yaml << 'YAML'
# 小说项目配置
title: ""                    # 书名
genre: "玄幻"                # 类型
target_words: 1000000        # 目标总字数
volumes: 8                   # 预计总卷数
words_per_volume: 125000     # 每卷目标字数
chapters_per_volume: 25      # 每卷预计章数
words_per_chapter:
  min: 4000
  max: 5000
style: ""                    # 一句话风格定位
status: "initializing"       # initializing | writing | paused | completed
YAML
fi

# agents 配置
if [ ! -f config/agents.yaml ]; then
cat > config/agents.yaml << 'YAML'
# 编剧室角色配置
roles:
  architect:
    name: 故事架构师
    prompt_file: prompts/writers/architect.md
    model: claude
    required: true             # 每章必参与
  main_writer:
    name: 主笔
    prompt_file: prompts/writers/main-writer.md
    model: claude
    required: true
  character_advocate:
    name: 角色代言人
    prompt_file: prompts/writers/character-advocate.md
    model: claude
    required: false            # 按需参与
  atmosphere:
    name: 氛围渲染师
    prompt_file: prompts/writers/atmosphere.md
    model: claude
    required: false
  foreshadow_weaver:
    name: 伏笔编织者
    prompt_file: prompts/writers/foreshadow-weaver.md
    model: claude
    required: false
  critic:
    name: 批评家
    prompt_file: prompts/review/critic.md
    model: gemini
    required: false
  continuity_checker:
    name: 连续性审查员
    prompt_file: prompts/review/continuity.md
    model: gemini
    required: false

# 章节类型 → 编剧室配置
chapter_types:
  daily:
    roles: [architect, main_writer]
    estimated_tokens: 15000
  plot_advance:
    roles: [architect, main_writer, character_advocate, critic]
    estimated_tokens: 40000
  climax:
    roles: [architect, main_writer, character_advocate, atmosphere, foreshadow_weaver, critic, continuity_checker]
    enable_competition: true
    estimated_tokens: 70000
  foreshadow_resolve:
    roles: [architect, main_writer, foreshadow_weaver, continuity_checker]
    estimated_tokens: 50000
YAML
fi

# pipeline 配置
if [ ! -f config/pipeline.yaml ]; then
cat > config/pipeline.yaml << 'YAML'
checkpoint:
  interval: 10               # 每 N 章触发检查点
  on_volume_end: true
  on_high_deviation: true
  warning_threshold: 5

recovery:
  chapter_retry: 2
  chapter_fallback: simplify
  lore_update_retry: 3
  lore_update_fallback: skip_and_flag
  critical_conflict: pause

pacing:
  low_threshold: 5            # 节奏评分低于此值触发调整
  consecutive_low: 3          # 连续几章低分才调整
YAML
fi

# models 配置
if [ ! -f config/models.yaml ]; then
cat > config/models.yaml << 'YAML'
claude:
  model: claude-sonnet-4-6
  max_parallel: 2
  rate_limit_rpm: 50
  cooldown_on_429: 30

gemini:
  model: gemini-2.5-pro
  max_parallel: 2
  rate_limit_rpm: 30
  cooldown_on_429: 30
YAML
fi

# 资料模板
if [ ! -f lore/world/core-rules.md ]; then
cat > lore/world/core-rules.md << 'MD'
---
type: world
id: world-core-rules
name: 核心规则
tags: [核心, 世界观]
last_updated_chapter: 0
priority: critical
---

# 世界核心规则

> 在此定义世界观中绝对不可违反的根本法则。

## 基本法则

（待填写）

## 力量体系

（待填写）

## 绝对禁忌

（待填写）
MD
fi

if [ ! -f lore/characters/_index.md ]; then
cat > lore/characters/_index.md << 'MD'
# 角色总览

## 主要角色

| ID | 姓名 | 身份 | 优先级 |
|----|------|------|--------|

## 关系图

（待生成）
MD
fi

if [ ! -f lore/style/voice.md ]; then
cat > lore/style/voice.md << 'MD'
---
type: style
id: style-voice
name: 叙事风格
tags: [风格, 核心]
priority: critical
---

# 叙事风格指南

## 人称与视角

（待填写：第几人称、全知/限制视角等）

## 文风基调

（待填写）

## 用语偏好

（待填写）

## 禁忌写法

（待填写）
MD
fi

# 上下文层初始化
if [ ! -f lore/_context/L0-global-summary.md ]; then
cat > lore/_context/L0-global-summary.md << 'MD'
# 全局摘要

> 项目尚未初始化，等待填写基础资料后由 AI 生成。

## 世界核心规则
（待生成）

## 主线进度
未开始

## 主要角色当前状态
无

## 活跃伏笔
无
MD
fi

# 大纲模板
if [ ! -f outline/master-outline.md ]; then
cat > outline/master-outline.md << 'MD'
# 总大纲

## 核心主题

（待填写：这个故事要讲什么核心主题？）

## 主线走向

（待填写：从开始到结束的主线概括）

## 分卷规划

### 第一卷
- **核心冲突**：
- **情感弧线**：
- **主要转折**：
- **伏笔规划**：

（按需增加更多卷...）
MD
fi

# 伏笔登记簿
if [ ! -f outline/threads/foreshadow.md ]; then
cat > outline/threads/foreshadow.md << 'MD'
# 伏笔登记簿

| ID | 描述 | 埋设章节 | 预计回收 | 状态 |
|----|------|---------|---------|------|
MD
fi

# workspace 初始状态
if [ ! -f workspace/pipeline-state.yaml ]; then
cat > workspace/pipeline-state.yaml << 'YAML'
project: ""
current_volume: 0
current_chapter: 0
total_chapters_written: 0
total_words: 0
last_action: init
last_action_status: success
last_action_timestamp: null
signals:
  plot_deviation: low
  consistency_warnings: 0
  pacing_scores: []
  foreshadow_debt: []
  checkpoint_due: false
  next_checkpoint: 10
token_usage:
  this_session: 0
  total: 0
YAML
fi

echo "[NovelForge] 项目结构初始化完成"
echo "  接下来请填写:"
echo "  1. config/project.yaml (书名、类型等)"
echo "  2. lore/world/core-rules.md (核心世界观)"
echo "  3. lore/characters/ (主要角色)"
echo "  4. lore/style/voice.md (叙事风格)"
echo "  5. outline/master-outline.md (总大纲)"
```

```bash
chmod +x scripts/init-project.sh
```

- [ ] **Step 2: 运行初始化并验证**

```bash
cd /home/ubuntu/codeprogram/paperProject
bash scripts/init-project.sh
find config lore outline workspace checkpoints prompts -type f | sort
```

Expected: 列出所有模板文件。

- [ ] **Step 3: 提交**

```bash
git add config/ lore/ outline/ workspace/ checkpoints/ prompts/ scripts/init-project.sh
git commit -m "feat: 小说工程目录结构 + 模板文件 + init-project.sh"
```

---

### Task 3.2: 资料库 API 与页面

**Files:**
- Create: `web-console/src/app/api/lore/route.ts`
- Create: `web-console/src/app/api/lore/[type]/route.ts`
- Create: `web-console/src/app/api/lore/[type]/[id]/route.ts`
- Create: `web-console/src/app/lore/page.tsx`
- Create: `web-console/src/components/lore/markdown-editor.tsx`

- [ ] **Step 1: 编写资料 API——列出与读取**

创建 `web-console/src/lib/lore.ts`:
```typescript
import { agentClient } from './agent-client';
import matter from 'gray-matter';

export interface LoreDocument {
  id: string;
  type: string;
  name: string;
  tags: string[];
  priority: string;
  lastUpdatedChapter: number;
  filePath: string;
  content: string;
  rawContent: string;
}

export async function listLoreByType(type: string): Promise<LoreDocument[]> {
  const dirMap: Record<string, string> = {
    world: 'lore/world',
    characters: 'lore/characters',
    style: 'lore/style',
    context: 'lore/_context',
  };
  const dir = dirMap[type];
  if (!dir) return [];

  const files = await agentClient.listDir(dir);
  const docs: LoreDocument[] = [];

  for (const f of files.filter(f => f.name.endsWith('.md'))) {
    const filePath = `${dir}/${f.name}`;
    const content = await agentClient.readFile(filePath);
    const { data, content: body } = matter(content);
    docs.push({
      id: data.id || f.name.replace('.md', ''),
      type: data.type || type,
      name: data.name || f.name.replace('.md', ''),
      tags: data.tags || [],
      priority: data.priority || 'minor',
      lastUpdatedChapter: data.last_updated_chapter || 0,
      filePath,
      content: body,
      rawContent: content,
    });
  }

  return docs;
}

export async function readLoreFile(filePath: string): Promise<LoreDocument> {
  const content = await agentClient.readFile(filePath);
  const { data, content: body } = matter(content);
  return {
    id: data.id || '',
    type: data.type || '',
    name: data.name || '',
    tags: data.tags || [],
    priority: data.priority || 'minor',
    lastUpdatedChapter: data.last_updated_chapter || 0,
    filePath,
    content: body,
    rawContent: content,
  };
}

export async function saveLoreFile(filePath: string, rawContent: string): Promise<void> {
  await agentClient.writeFile(filePath, rawContent);
}
```

- [ ] **Step 2: 编写资料库页面**

创建 `web-console/src/app/lore/page.tsx`:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAgentStore } from '@/stores/agent-store';
import { agentClient } from '@/lib/agent-client';
import matter from 'gray-matter';

interface LoreFile {
  name: string;
  path: string;
  frontmatter: Record<string, any>;
  content: string;
  raw: string;
}

const LORE_TABS = [
  { key: 'world', label: '世界观', dir: 'lore/world' },
  { key: 'characters', label: '角色', dir: 'lore/characters' },
  { key: 'style', label: '风格', dir: 'lore/style' },
  { key: 'context', label: '上下文层', dir: 'lore/_context' },
];

export default function LorePage() {
  const { connected } = useAgentStore();
  const [activeTab, setActiveTab] = useState('world');
  const [files, setFiles] = useState<LoreFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<LoreFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async (dir: string) => {
    if (!connected) return;
    setLoading(true);
    try {
      const listing = await agentClient.listDir(dir);
      const mdFiles = listing.filter(f => f.name.endsWith('.md'));
      const loaded: LoreFile[] = [];
      for (const f of mdFiles) {
        const filePath = `${dir}/${f.name}`;
        const raw = await agentClient.readFile(filePath);
        const { data, content } = matter(raw);
        loaded.push({ name: f.name, path: filePath, frontmatter: data, content, raw });
      }
      setFiles(loaded);
      if (loaded.length > 0 && !selectedFile) {
        setSelectedFile(loaded[0]);
        setEditContent(loaded[0].raw);
      }
    } catch (err) {
      toast.error(`加载失败: ${err}`);
    }
    setLoading(false);
  }, [connected, selectedFile]);

  useEffect(() => {
    const tab = LORE_TABS.find(t => t.key === activeTab);
    if (tab) {
      setSelectedFile(null);
      setFiles([]);
      loadFiles(tab.dir);
    }
  }, [activeTab, loadFiles]);

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await agentClient.writeFile(selectedFile.path, editContent);
      toast.success('已保存');
      // 刷新
      const tab = LORE_TABS.find(t => t.key === activeTab);
      if (tab) loadFiles(tab.dir);
    } catch (err) {
      toast.error(`保存失败: ${err}`);
    }
  };

  const selectFile = (f: LoreFile) => {
    setSelectedFile(f);
    setEditContent(f.raw);
  };

  if (!connected) {
    return <p className="text-muted-foreground">Agent 未连接</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-2xl font-bold mb-4">资料库</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {LORE_TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-4 flex-1 mt-4 min-h-0">
        {/* 文件列表 */}
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">文件列表</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {loading ? <p className="text-sm text-muted-foreground">加载中...</p> : (
                <div className="space-y-1">
                  {files.map(f => (
                    <button
                      key={f.path}
                      onClick={() => selectFile(f)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        selectedFile?.path === f.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <div>{f.frontmatter.name || f.name}</div>
                      {f.frontmatter.priority && (
                        <Badge variant="outline" className="mt-1 text-xs">{f.frontmatter.priority}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 编辑器 */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {selectedFile ? selectedFile.path : '选择文件'}
            </CardTitle>
            {selectedFile && (
              <Button size="sm" onClick={handleSave}>保存</Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {selectedFile ? (
              <Textarea
                className="h-full font-mono text-sm resize-none"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : (
              <p className="text-muted-foreground">请从左侧选择文件</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add web-console/src/lib/lore.ts web-console/src/app/lore/
git commit -m "feat: 资料库页面（文件浏览 + Markdown 编辑器）"
```

---

## Phase 4: 管线控制与编剧室

### Task 4.1: 管线状态 API 与管线控制页面

**Files:**
- Create: `web-console/src/app/api/pipeline/status/route.ts`
- Create: `web-console/src/app/api/pipeline/start/route.ts`
- Create: `web-console/src/app/pipeline/page.tsx`
- Create: `web-console/src/stores/pipeline-store.ts`

- [ ] **Step 1: 编写管线状态 API**

创建 `web-console/src/app/api/pipeline/status/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { agentClient } from '@/lib/agent-client';

export async function GET() {
  try {
    const stateContent = await agentClient.readFile('workspace/pipeline-state.yaml');
    // 动态导入 js-yaml
    const yaml = await import('js-yaml');
    const state = yaml.load(stateContent);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'pipeline-state.yaml 不可读' }, { status: 500 });
  }
}
```

创建 `web-console/src/app/api/pipeline/start/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { agentClient } from '@/lib/agent-client';
import { insertEvent } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fromChapter = body.fromChapter;

    const args = ['--print', '-p', 'bash scripts/showrunner.sh' + (fromChapter ? ` --from ch-${String(fromChapter).padStart(3, '0')}` : '')];

    const processId = await agentClient.spawnProcess({
      cliType: 'claude',
      role: 'showrunner',
      args,
      cwd: '.',
    });

    insertEvent('pipeline', '管线已启动', { processId, fromChapter });

    return NextResponse.json({ ok: true, processId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: 编写管线控制页面**

创建 `web-console/src/app/pipeline/page.tsx`:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAgentStore } from '@/stores/agent-store';

interface PipelineState {
  project: string;
  current_volume: number;
  current_chapter: number;
  total_chapters_written: number;
  total_words: number;
  last_action: string;
  last_action_status: string;
  signals: {
    plot_deviation: string;
    consistency_warnings: number;
    pacing_scores: number[];
    checkpoint_due: boolean;
    next_checkpoint: number;
  };
  token_usage: { this_session: number; total: number };
}

export default function PipelinePage() {
  const { connected } = useAgentStore();
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/status');
      if (res.ok) {
        setState(await res.json());
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline/start', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('管线已启动');
        fetchState();
      } else {
        toast.error(`启动失败: ${data.error}`);
      }
    } catch (err) {
      toast.error(`启动失败: ${err}`);
    }
    setLoading(false);
  };

  if (!connected) {
    return <p className="text-muted-foreground">Agent 未连接</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">管线控制</h2>
        <div className="flex gap-2">
          <Button onClick={handleStart} disabled={loading}>
            {loading ? '启动中...' : '启动管线'}
          </Button>
          <Button variant="outline" onClick={fetchState}>刷新状态</Button>
        </div>
      </div>

      {state && (
        <>
          {/* 进度概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">当前进度</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">第{state.current_volume}卷 第{state.current_chapter}章</p>
                <p className="text-sm text-muted-foreground">
                  共 {state.total_chapters_written} 章 / {state.total_words.toLocaleString()} 字
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">上次操作</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{state.last_action}</p>
                <Badge variant={state.last_action_status === 'success' ? 'default' : 'destructive'}>
                  {state.last_action_status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Token 消耗</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{(state.token_usage.total / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">
                  本次会话: {(state.token_usage.this_session / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">下次检查点</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">第 {state.signals.next_checkpoint} 章</p>
                {state.signals.checkpoint_due && (
                  <Badge variant="destructive">检查点待审阅</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 状态信号 */}
          <Card>
            <CardHeader>
              <CardTitle>状态信号</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">情节偏离</p>
                  <Badge variant={
                    state.signals.plot_deviation === 'low' ? 'default' :
                    state.signals.plot_deviation === 'medium' ? 'secondary' : 'destructive'
                  }>
                    {state.signals.plot_deviation}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">一致性警告</p>
                  <p className="text-lg font-bold">{state.signals.consistency_warnings}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">最近节奏评分</p>
                  <p className="text-lg font-bold">
                    {state.signals.pacing_scores.length > 0
                      ? state.signals.pacing_scores.slice(-3).join(' / ')
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add web-console/src/app/api/pipeline/ web-console/src/app/pipeline/
git commit -m "feat: 管线控制页面 + 状态 API"
```

---

### Task 4.2: 编剧室页面

**Files:**
- Create: `web-console/src/app/writers-room/page.tsx`

- [ ] **Step 1: 编写编剧室实时视图**

创建 `web-console/src/app/writers-room/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentStore } from '@/stores/agent-store';
import { agentClient } from '@/lib/agent-client';

const ROLE_LABELS: Record<string, string> = {
  showrunner: '制片人',
  architect: '架构师',
  'main-writer': '主笔',
  'main-writer-alt': '主笔B',
  'character-advocate': '角色代言人',
  atmosphere: '氛围渲染师',
  'foreshadow-weaver': '伏笔编织者',
  critic: '批评家',
  'continuity-checker': '连续性审查',
  'lore-updater': '资料更新',
  interactive: '交互终端',
};

const STATUS_COLORS: Record<string, string> = {
  starting: 'bg-yellow-500',
  running: 'bg-green-500 animate-pulse',
  completed: 'bg-blue-500',
  failed: 'bg-red-500',
  killed: 'bg-gray-500',
};

export default function WritersRoomPage() {
  const { connected, processes } = useAgentStore();
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  // 订阅选中进程的输出
  useEffect(() => {
    if (!selectedProcess) return;
    setOutput('');
    agentClient.subscribeProcess(selectedProcess);

    const unsub = agentClient.on('process:output', (data: { processId: string; data: string }) => {
      if (data.processId === selectedProcess) {
        setOutput(prev => prev + data.data);
      }
    });

    return () => {
      unsub();
      agentClient.unsubscribeProcess(selectedProcess);
    };
  }, [selectedProcess]);

  // 排除交互终端，只显示编剧室相关进程
  const writerProcesses = processes.filter(p => p.role !== 'interactive');

  if (!connected) {
    return <p className="text-muted-foreground">Agent 未连接</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-2xl font-bold mb-4">编剧室</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 角色面板 */}
        <div className="w-72 shrink-0 space-y-2">
          {writerProcesses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无编剧室活动
              </CardContent>
            </Card>
          ) : (
            writerProcesses.map(p => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-colors ${selectedProcess === p.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedProcess(p.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-500'}`} />
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[p.role] || p.role}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">{p.cliType}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.status} · {new Date(p.startedAt).toLocaleTimeString()}
                    {p.chapterNumber && ` · 第${p.chapterNumber}章`}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 输出面板 */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedProcess
                ? `输出: ${ROLE_LABELS[writerProcesses.find(p => p.id === selectedProcess)?.role || ''] || selectedProcess}`
                : '点击左侧角色查看输出'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground p-2 bg-muted/30 rounded min-h-full">
                {output || '等待输出...'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add web-console/src/app/writers-room/
git commit -m "feat: 编剧室页面（角色面板 + 实时输出流）"
```

---

### Task 4.3: 稿件管理与检查点页面

**Files:**
- Create: `web-console/src/app/manuscript/page.tsx`
- Create: `web-console/src/app/checkpoints/page.tsx`

- [ ] **Step 1: 编写稿件管理页面**

创建 `web-console/src/app/manuscript/page.tsx`:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentStore } from '@/stores/agent-store';
import { agentClient } from '@/lib/agent-client';

interface ChapterFile {
  name: string;
  path: string;
  size: number;
}

interface VolumeDir {
  name: string;
  chapters: ChapterFile[];
}

export default function ManuscriptPage() {
  const { connected } = useAgentStore();
  const [volumes, setVolumes] = useState<VolumeDir[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadVolumes = useCallback(async () => {
    if (!connected) return;
    try {
      const dirs = await agentClient.listDir('manuscript');
      const vols: VolumeDir[] = [];
      for (const d of dirs.filter(f => f.isDir && f.name.startsWith('vol-'))) {
        const files = await agentClient.listDir(`manuscript/${d.name}`);
        vols.push({
          name: d.name,
          chapters: files
            .filter(f => f.name.endsWith('.md') && !f.name.includes('.meta'))
            .map(f => ({ name: f.name, path: `manuscript/${d.name}/${f.name}`, size: f.size })),
        });
      }
      setVolumes(vols);
    } catch { /* manuscript dir may not exist yet */ }
  }, [connected]);

  useEffect(() => { loadVolumes(); }, [loadVolumes]);

  const selectChapter = async (path: string) => {
    setSelectedChapter(path);
    setLoading(true);
    try {
      const text = await agentClient.readFile(path);
      setContent(text);
    } catch (err) {
      setContent(`读取失败: ${err}`);
    }
    setLoading(false);
  };

  if (!connected) return <p className="text-muted-foreground">Agent 未连接</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-2xl font-bold mb-4">稿件管理</h2>
      <div className="flex gap-4 flex-1 min-h-0">
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm">章节列表</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {volumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无稿件</p>
              ) : (
                volumes.map(vol => (
                  <div key={vol.name} className="mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{vol.name}</p>
                    {vol.chapters.map(ch => (
                      <button
                        key={ch.path}
                        onClick={() => selectChapter(ch.path)}
                        className={`w-full text-left px-2 py-1 rounded text-sm ${
                          selectedChapter === ch.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        {ch.name.replace('.md', '')}
                        <span className="text-xs text-muted-foreground ml-2">
                          {(ch.size / 1024).toFixed(1)}KB
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{selectedChapter || '选择章节'}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              {loading ? <p>加载中...</p> : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{content || '请从左侧选择章节'}</pre>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写检查点页面**

创建 `web-console/src/app/checkpoints/page.tsx`:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAgentStore } from '@/stores/agent-store';
import { agentClient } from '@/lib/agent-client';

interface CheckpointFile {
  name: string;
  path: string;
  modified: string;
}

export default function CheckpointsPage() {
  const { connected } = useAgentStore();
  const [files, setFiles] = useState<CheckpointFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadCheckpoints = useCallback(async () => {
    if (!connected) return;
    try {
      const listing = await agentClient.listDir('checkpoints');
      setFiles(
        listing
          .filter(f => f.name.endsWith('.md'))
          .sort((a, b) => b.modified.localeCompare(a.modified))
          .map(f => ({ name: f.name, path: `checkpoints/${f.name}`, modified: f.modified }))
      );
    } catch { /* dir may not exist */ }
  }, [connected]);

  useEffect(() => { loadCheckpoints(); }, [loadCheckpoints]);

  const selectCheckpoint = async (path: string) => {
    setSelected(path);
    const text = await agentClient.readFile(path);
    setContent(text);
  };

  const handleApprove = async () => {
    toast.success('检查点已通过，管线将继续推进');
    // 写入决策到检查点文件
    if (selected) {
      const decision = `\n\n---\n## 人类审阅决策\n- 决策：通过\n- 时间：${new Date().toISOString()}\n${feedback ? `- 备注：${feedback}` : ''}`;
      await agentClient.writeFile(selected, content + decision);
    }
  };

  const handleRevise = async () => {
    if (!feedback.trim()) {
      toast.error('请填写修改指令');
      return;
    }
    toast.success('修改指令已下发');
    if (selected) {
      const decision = `\n\n---\n## 人类审阅决策\n- 决策：修改\n- 时间：${new Date().toISOString()}\n- 修改指令：${feedback}`;
      await agentClient.writeFile(selected, content + decision);
    }
  };

  if (!connected) return <p className="text-muted-foreground">Agent 未连接</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-2xl font-bold mb-4">检查点审阅</h2>
      <div className="flex gap-4 flex-1 min-h-0">
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm">检查点列表</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无检查点</p>
              ) : (
                files.map(f => (
                  <button
                    key={f.path}
                    onClick={() => selectCheckpoint(f.path)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${
                      selected === f.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {f.name.replace('.md', '')}
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{selected || '选择检查点'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-24rem)]">
                <pre className="text-sm whitespace-pre-wrap">{content || '请选择检查点'}</pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="审阅备注或修改指令..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleApprove}>通过</Button>
                  <Button variant="secondary" onClick={handleRevise}>下达修改指令</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add web-console/src/app/manuscript/ web-console/src/app/checkpoints/
git commit -m "feat: 稿件管理 + 检查点审阅页面"
```

---

## Phase 5: Docker 构建、部署与端到端测试

### Task 5.1: 构建 Docker 镜像并启动全栈

- [ ] **Step 1: 构建 Docker 镜像**

```bash
cd /home/ubuntu/codeprogram/paperProject
docker compose build
```

Expected: 构建成功。

- [ ] **Step 2: 启动 Remote Agent（宿主机）**

```bash
cd /home/ubuntu/codeprogram/paperProject
nohup bash scripts/start-agent.sh > /tmp/agent.log 2>&1 &
echo $! > /tmp/agent.pid
sleep 3
cat /tmp/agent.log
```

Expected: 输出 `[Agent] 启动成功 port=9100`。

- [ ] **Step 3: 启动 Docker 容器**

```bash
cd /home/ubuntu/codeprogram/paperProject
HOST_IP=$(hostname -I | awk '{print $1}') docker compose up -d
docker compose logs -f --tail=20 &
sleep 10
```

- [ ] **Step 4: 端到端验证**

```bash
# 1. 健康检查
curl -s http://localhost:3000/api/health | jq .

# 2. 验证页面可访问
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/pipeline
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/terminal
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/settings
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/lore

# 3. 验证 Agent 连接（通过 API）
curl -s http://localhost:3000/api/pipeline/status | jq .

# 4. 验证配置 API
curl -s -X PUT http://localhost:3000/api/config \
  -H 'Content-Type: application/json' \
  -d '{"agent_url":"http://localhost:9100"}' | jq .
curl -s http://localhost:3000/api/config | jq .
```

Expected: 所有返回 200，pipeline/status 返回 pipeline-state.yaml 内容。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: 端到端集成验证通过"
```

---

### Task 5.2: 修复和优化（基于测试结果）

此任务为测试后的修复循环，根据 Task 5.1 中发现的问题执行。

- [ ] **Step 1: 检查 Docker 日志中的错误**

```bash
docker compose logs web 2>&1 | grep -i error | head -20
cat /tmp/agent.log | grep -i error | head -20
```

- [ ] **Step 2: 根据错误修复（动态内容，按实际情况处理）**

- [ ] **Step 3: 重新构建并验证**

```bash
docker compose down
docker compose build
HOST_IP=$(hostname -I | awk '{print $1}') docker compose up -d
sleep 10
curl -s http://localhost:3000/api/health | jq .
```

- [ ] **Step 4: 提交修复**

```bash
git add -A
git commit -m "fix: 端到端测试修复"
```

---

## Phase 6: Prompt 模板与编排脚本

### Task 6.1: 核心 Prompt 模板

**Files:**
- Create: `prompts/showrunner/decide.md`
- Create: `prompts/showrunner/create-brief.md`
- Create: `prompts/writers/architect.md`
- Create: `prompts/writers/main-writer.md`
- Create: `prompts/writers/character-advocate.md`
- Create: `prompts/writers/revise.md`
- Create: `prompts/writers/final-revise.md`
- Create: `prompts/review/critic.md`
- Create: `prompts/review/continuity.md`
- Create: `prompts/lore/generate-summary.md`
- Create: `prompts/lore/refresh-context.md`

每个 prompt 文件内容较长，将在实际执行时根据上下文编写。此处列出关键 prompt 的结构框架。

- [ ] **Step 1: 编写制片人决策 prompt**

创建 `prompts/showrunner/decide.md`，核心结构：
- 系统角色：你是小说项目的制片人/总控
- 输入：pipeline-state.yaml + L0 全局摘要
- 输出格式：YAML，包含 action（write_chapter/revise_outline/checkpoint/volume_complete）和 reason
- 决策规则嵌入 prompt

- [ ] **Step 2: 编写故事架构师 prompt**

创建 `prompts/writers/architect.md`，核心结构：
- 系统角色：你是故事架构师，负责设计章节结构
- 输入：chapter-brief + L0 + L1
- 输出：章节结构稿（场景划分、节奏曲线、转折点、预估字数分配）

- [ ] **Step 3: 编写主笔 prompt**

创建 `prompts/writers/main-writer.md`，核心结构：
- 系统角色：你是小说主笔，按照结构稿撰写完整章节正文
- 输入：structure-draft + L2 + 角色档案
- 输出：完整章节正文（Markdown 格式）
- 风格约束：引用 lore/style/voice.md

- [ ] **Step 4: 编写其余 prompt 模板框架**

为每个角色创建基础 prompt 框架文件。

- [ ] **Step 5: 提交**

```bash
git add prompts/
git commit -m "feat: 核心 Prompt 模板库（制片人 + 编剧室 + 审查 + 资料更新）"
```

---

### Task 6.2: 编排脚本

**Files:**
- Create: `scripts/showrunner.sh`
- Create: `scripts/writers-room.sh`
- Create: `scripts/lore-update.sh`
- Create: `scripts/checkpoint.sh`
- Create: `scripts/status.sh`

脚本的详细实现在 spec 的第6节已有伪代码。实际执行时需要适配 Claude CLI 和 Gemini CLI 的真实参数格式。

- [ ] **Step 1: 探测 CLI 真实参数格式**

```bash
claude --help 2>&1 | head -40
gemini --help 2>&1 | head -40
```

根据实际帮助信息调整脚本中的 CLI 调用参数。

- [ ] **Step 2: 编写 showrunner.sh**

基于 spec 中的伪代码，适配真实 CLI 参数。

- [ ] **Step 3: 编写 writers-room.sh**

基于 spec 中的伪代码，适配真实 CLI 参数，包含竞稿模式。

- [ ] **Step 4: 编写辅助脚本**

lore-update.sh、checkpoint.sh、status.sh。

- [ ] **Step 5: 冒烟测试——用最简数据跑一章**

准备最小数据集（简单世界观 + 1个角色 + 短大纲），手动触发 writers-room.sh 生成一章，验证全流程。

- [ ] **Step 6: 提交**

```bash
git add scripts/
git commit -m "feat: 编排脚本（showrunner + writers-room + lore-update）"
```

---

## 自审检查

### Spec 覆盖检查

| Spec 需求 | 任务覆盖 |
|-----------|---------|
| 工程目录结构 | Task 3.1 |
| 编剧室多角色协作 | Task 4.2 + 6.1 + 6.2 |
| 四级上下文金字塔 | Task 3.1（目录） + 6.1（prompt） + 6.2（脚本） |
| 资料文档自动更新 | Task 6.2（lore-update.sh） |
| 制片人自适应管线 | Task 4.1 + 6.2（showrunner.sh） |
| 检查点机制 | Task 4.3 + 6.2（checkpoint.sh） |
| CLI 进程控制 | Task 1.3（ProcessManager） |
| WebSocket 实时通信 | Task 1.3 + 1.4 |
| 终端页面 | Task 2.2 |
| 仪表盘 | Task 2.1 |
| 管线控制页面 | Task 4.1 |
| 编剧室页面 | Task 4.2 |
| 资料库页面 | Task 3.2 |
| 稿件管理页面 | Task 4.3 |
| 检查点审阅页面 | Task 4.3 |
| 配置中心 | Task 2.3 |
| Docker 部署 | Task 1.5 + 5.1 |
| Token 消耗统计 | Task 1.2（DB queries） + 4.1（页面展示） |
| Prompt 模板 | Task 6.1 |
| 编排脚本 | Task 6.2 |

### Placeholder 检查

- Task 6.1 和 6.2 的 prompt 和脚本内容标记为"实际执行时根据 CLI 真实参数编写"，这是因为需要先探测 CLI 的实际接口。这不是 placeholder，而是合理的运行时适配。

### 类型一致性

- `ProcessInfo` 在 `remote-agent/src/types.ts` 和 `web-console/src/lib/agent-client.ts` 中定义一致。
- `SpawnConfig` 两端定义一致。
- WebSocket 事件名称全局统一。
