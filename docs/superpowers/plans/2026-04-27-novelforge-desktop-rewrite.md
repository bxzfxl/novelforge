# NovelForge Desktop — 完全重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建 Electron 桌面写作工作室，零 CLI 依赖、API 直调、Phase 1 免费全功能 MVP。

**Architecture:** Electron Main Process (Node.js) 承载引擎/AI/数据库/文件系统，Renderer Process (Chromium) 承载 React SPA。通过 contextBridge IPC 安全通信。Vite 构建渲染进程，tsx 运行主进程。

**Tech Stack:** Electron 34+, React 19, TypeScript 5.7, Vite, shadcn/ui, Zustand, better-sqlite3, Anthropic SDK, Google AI SDK, OpenAI SDK, electron-builder, Vitest, Playwright

---

## 并行执行策略

```
Group 0:  Git Repo + Monorepo Scaffold (顺序，阻塞所有后续)
Group 1A: Electron Shell           (并行)
Group 1B: Shared Types Package     (并行)
Group 2A: Database + FileStore     (并行，依赖 Group 1B)
Group 2B: AI Layer (5个Task)      (并行，依赖 Group 1B)
Group 3A: Prompt Templates         (依赖 Group 2B)
Group 3B: Engine (Pipeline/WritersRoom/Lore) (依赖 Group 2A + 2B)
Group 4:  IPC Bridge              (依赖 Group 3A + 3B)
Group 5A: UI Layout + Panels      (并行，依赖 Group 4)
Group 5B: Pages + Stores          (并行，依赖 Group 4)
Group 6:  Integration + Polish    (依赖 Group 5A + 5B)
Group 7:  Tests + Packaging       (依赖 Group 6)
```

---

## Group 0: 仓库与基础脚手架

### Task 0.1: Git 仓库整理 + _legacy 隔离

**Files:**
- Move: `web-console/` → `_legacy/web-console/`
- Move: `remote-agent/` → `_legacy/remote-agent/`
- Move: `scripts/` → `_legacy/scripts/`
- Move: `config/` → `_legacy/config/`
- Move: `prompts/` → `_legacy/prompts/`
- Move: `docker-compose.yaml` → `_legacy/docker-compose.yaml`
- Move: `package.json` → `_legacy/package.json` (root package.json)
- Move: `pnpm-workspace.yaml` → `_legacy/pnpm-workspace.yaml` (root)
- Move: `pnpm-lock.yaml` → `_legacy/pnpm-lock.yaml`

- [ ] **Step 1: 创建 _legacy 目录并移动所有旧代码**

```bash
mkdir -p _legacy
git mv web-console remote-agent scripts config prompts _legacy/
git mv docker-compose.yaml _legacy/
git mv package.json _legacy/package.json
git mv pnpm-workspace.yaml _legacy/pnpm-workspace.yaml
git mv pnpm-lock.yaml _legacy/pnpm-lock.yaml
```

- [ ] **Step 2: 移动后验证目录结构**

```bash
ls _legacy/
# Expected: web-console/ remote-agent/ scripts/ config/ prompts/ docker-compose.yaml
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(repo): 旧代码移入 _legacy/ 隔离，为新 Electron 项目腾出根目录"
```

### Task 0.2: Monorepo 根脚手架

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建 root package.json**

```json
{
  "name": "novelforge",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @novelforge/desktop dev",
    "dev:debug": "pnpm --filter @novelforge/desktop dev:debug",
    "build": "pnpm --filter @novelforge/desktop build",
    "build:desktop": "pnpm --filter @novelforge/desktop build:desktop",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "pnpm --filter @novelforge/desktop test:e2e",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "vitest": "^3.0.0"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: 创建 .gitignore**

```gitignore
node_modules/
dist/
out/
.env
*.db
*.db-journal
*.db-wal
.DS_Store
Thumbs.db
*.log
```

- [ ] **Step 5: 初始化 monorepo + Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.json .gitignore
git commit -m "chore(root): monorepo 根脚手架 — pnpm workspace + TypeScript 基础配置"
```

### Task 0.3: Electron Shell — 主进程入口

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/main/window-manager.ts`
- Create: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: 创建 apps/desktop/package.json**

```json
{
  "name": "@novelforge/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx scripts/dev-main.ts\"",
    "dev:debug": "concurrently \"vite\" \"tsx scripts/dev-main.ts --inspect\"",
    "build": "vite build && tsc -p tsconfig.main.json",
    "build:desktop": "pnpm build && electron-builder",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.main.json",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "@anthropic-ai/sdk": "^0.50.0",
    "@google/generative-ai": "^0.24.0",
    "openai": "^5.0.0",
    "zod": "^3.24.0",
    "yaml": "^2.7.0"
  },
  "devDependencies": {
    "electron": "^34.0.0",
    "electron-builder": "^26.0.0",
    "@electron/rebuild": "^4.0.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "vite-plugin-electron": "^0.29.0",
    "vite-plugin-electron-renderer": "^0.15.0",
    "concurrently": "^9.0.0",
    "tsx": "^4.19.0",
    "@playwright/test": "^1.50.0"
  }
}
```

- [ ] **Step 2: 创建 apps/desktop/tsconfig.json (renderer)**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/renderer",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/renderer/*"],
      "@novelforge/shared": ["../../packages/shared/src"],
      "@novelforge/prompts": ["../../packages/prompts/src"]
    }
  },
  "include": ["src/renderer/**/*", "src/preload/**/*"]
}
```

- [ ] **Step 3: 创建 apps/desktop/tsconfig.main.json (main process)**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/main",
    "baseUrl": ".",
    "paths": {
      "@novelforge/shared": ["../../packages/shared/src"],
      "@novelforge/prompts": ["../../packages/prompts/src"]
    }
  },
  "include": ["src/main/**/*"]
}
```

- [ ] **Step 4: 创建 apps/desktop/src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import { WindowManager } from './window-manager'

let windowManager: WindowManager

app.whenReady().then(() => {
  windowManager = new WindowManager()
  windowManager.createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow()
  }
})
```

- [ ] **Step 5: 创建 apps/desktop/src/main/window-manager.ts**

```typescript
import { BrowserWindow, app } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

export class WindowManager {
  mainWindow: BrowserWindow | null = null

  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 680,
      title: 'NovelForge',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }
  }
}
```

- [ ] **Step 6: 创建 apps/desktop/src/preload/index.ts**

```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('novelforge', {
  // Stub — 后续 Task 填充实际 API
  platform: process.platform,
  version: '0.1.0',
})
```

- [ ] **Step 7: 创建 Vite 配置 apps/desktop/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
```

- [ ] **Step 8: 创建 scripts/dev-main.ts**

```typescript
import { spawn } from 'child_process'
import path from 'path'

const electronPath = path.join(
  __dirname, '..', 'node_modules', '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)

const p = spawn(electronPath, ['.'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit',
})

p.on('close', (code) => process.exit(code ?? 0))
```

- [ ] **Step 9: 创建 Renderer 入口 apps/desktop/src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NovelForge</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 10: 创建 apps/desktop/src/renderer/main.tsx**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

- [ ] **Step 11: 创建 apps/desktop/src/renderer/App.tsx**

```typescript
export function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <h1 className="text-2xl font-bold">NovelForge</h1>
    </div>
  )
}
```

- [ ] **Step 12: 创建全局样式 apps/desktop/src/renderer/styles/globals.css**

```css
@import "tailwindcss";
@source "../../node_modules/@shadcn/ui/dist/**/*.js";

@theme {
  --color-nf-bg: #09090b;
  --color-nf-surface: #18181b;
  --color-nf-border: #27272a;
  --color-nf-text: #fafafa;
  --color-nf-muted: #a1a1aa;
  --color-nf-accent: #a78bfa;
}


* { margin: 0; padding: 0; box-sizing: border-box; }

html, body, #root {
  height: 100%;
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--color-nf-bg);
  color: var(--color-nf-text);
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-nf-border); border-radius: 3px; }
```

- [ ] **Step 13: 安装依赖 + 验证 + Commit**

```bash
cd apps/desktop && pnpm install
pnpm typecheck
# Expected: 无错误
git add apps/desktop/ scripts/
git commit -m "feat(desktop): Electron shell — 主进程/预加载/Vite渲染器/开发模式"
```

---

## Group 1A: Electron Shell 增强 (可并行)

### Task 1A.1: Tailwind + shadcn/ui 集成

**Files:**
- Create: `apps/desktop/tailwind.config.ts`
- Create: `apps/desktop/postcss.config.js`
- Create: `apps/desktop/src/renderer/lib/utils.ts`
- Create: `apps/desktop/src/renderer/components/ui/` (shadcn 基础组件)

- [ ] **Step 1: tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'
export default {
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nf: {
          bg: '#09090b',
          surface: '#18181b',
          border: '#27272a',
          text: '#fafafa',
          muted: '#a1a1aa',
          accent: '#a78bfa',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

- [ ] **Step 2: 初始化 shadcn/ui**

```bash
cd apps/desktop && npx shadcn@latest init -d
npx shadcn@latest add button input dialog dropdown-menu tooltip scroll-area separator tabs card badge skeleton toast
```

- [ ] **Step 3: 验证 + Commit**

```bash
pnpm dev &
# 验证窗口显示 NovelForge 标题
git add apps/desktop/
git commit -m "feat(desktop): Tailwind CSS + shadcn/ui 组件库集成"
```

---

## Group 1B: 共享类型包 (可并行)

### Task 1B: @novelforge/shared 类型包

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types/project.ts`
- Create: `packages/shared/src/types/chapter.ts`
- Create: `packages/shared/src/types/lore.ts`
- Create: `packages/shared/src/types/pipeline.ts`
- Create: `packages/shared/src/types/ai.ts`
- Create: `packages/shared/src/types/settings.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: packages/shared/package.json**

```json
{
  "name": "@novelforge/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: 类型定义 — packages/shared/src/types/project.ts**

```typescript
export interface Project {
  id: string
  name: string
  title: string
  author: string
  genre: string
  subGenre?: string
  targetWords: number
  synopsis: string
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: string
  projectId: string
  number: number
  title: string
  synopsis: string
  status: 'planned' | 'writing' | 'completed'
  targetChapters: number
}
```

- [ ] **Step 3: 类型定义 — packages/shared/src/types/chapter.ts**

```typescript
export interface ChapterMeta {
  id: string
  volumeId: string
  number: number
  title: string
  status: 'draft' | 'review' | 'final'
  wordCount: number
  targetWords: number
  pov: string
  characters: string[]
  locations: string[]
  events: string[]
  foreshadowPlanted: string[]
  foreshadowResolved: string[]
  aiModel: string
  aiTokens: number
  aiCostUsd: number
  createdAt: string
  revisedAt: string
}

export interface ChapterContent {
  meta: ChapterMeta
  body: string
}
```

- [ ] **Step 4: 类型定义 — packages/shared/src/types/lore.ts**

```typescript
export type LoreCategory = 'world' | 'characters' | 'style'

export interface LoreEntry {
  id: string
  projectId: string
  category: LoreCategory
  key: string
  title: string
  content: string
  autoGenerated: boolean
  updatedAt: string
}

export interface ContextLayer {
  id: string
  projectId: string
  level: 'L0' | 'L1' | 'L2'
  volumeId?: string
  content: string
  generatedAt: string
  sourceChapterIds: string[]
}
```

- [ ] **Step 5: 类型定义 — packages/shared/src/types/pipeline.ts**

```typescript
export type PipelinePhase =
  | 'idle'
  | 'planning'
  | 'writing'
  | 'lore_updating'
  | 'checkpoint'
  | 'paused'
  | 'error'
  | 'completed'

export type WriterRole =
  | 'showrunner'
  | 'architect'
  | 'main_writer'
  | 'character_advocate'
  | 'atmosphere'
  | 'critic'
  | 'continuity'
  | 'revise'
  | 'summary'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PipelineStep {
  id: string
  role: WriterRole
  status: StepStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  modelUsed?: string
  tokensUsed?: number
  costUsd?: number
  error?: string
}

export interface PipelineState {
  id: string
  projectId: string
  status: PipelinePhase
  currentChapterId?: string
  currentVolumeId?: string
  steps: PipelineStep[]
  totalChapters: number
  completedChapters: number
  totalTokens: number
  totalCostUsd: number
  startedAt?: string
}
```

- [ ] **Step 6: 类型定义 — packages/shared/src/types/ai.ts**

```typescript
export type AIProviderType =
  | 'anthropic'
  | 'google'
  | 'openai'
  | 'openai-compatible'
  | 'custom'

export interface ModelConfig {
  id: string
  provider: AIProviderType
  displayName: string
  apiKey: string
  baseURL?: string
  modelId: string
  maxTokens?: number
  maxConcurrency?: number
  tags: string[]
  enabled: boolean
}

export interface RoleModelBinding {
  roleId: string
  primaryModelId: string
  fallbackModelId?: string
}

export interface AICallLog {
  id: string
  pipelineRunId?: string
  role: string
  modelId: string
  provider: AIProviderType
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
  status: 'success' | 'error'
  error?: string
  createdAt: string
}

export interface PromptTemplate {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  config: {
    model?: string
    maxTokens?: number
    temperature?: number
  }
}

export interface ChatResult {
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content?: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  error?: string
}

export interface AIChatProvider {
  chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string
    maxTokens?: number
    temperature?: number
    signal?: AbortSignal
  }): Promise<ChatResult>

  chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string
    maxTokens?: number
    temperature?: number
    signal?: AbortSignal
  }): AsyncIterable<StreamChunk>

  models(): Promise<Array<{ id: string; name: string }>>

  validate(): Promise<{ valid: boolean; error?: string }>
}
```

- [ ] **Step 7: 类型定义 — packages/shared/src/types/settings.ts**

```typescript
export interface AppSettings {
  theme: 'dark' | 'light'
  language: 'zh-CN' | 'en'
  fontSize: number
  autoSaveIntervalMs: number
  models: ModelConfig[]
  roleBindings: RoleModelBinding[]
  defaultFallbackModelId?: string
  shortcuts: Record<string, string>
}
```

- [ ] **Step 8: 常量 — packages/shared/src/constants.ts**

```typescript
export const WRITER_ROLES = [
  'showrunner', 'architect', 'main_writer', 'character_advocate',
  'atmosphere', 'critic', 'continuity', 'revise', 'summary',
] as const

export const PIPELINE_PHASES = [
  'idle', 'planning', 'writing', 'lore_updating', 'checkpoint',
  'paused', 'error', 'completed',
] as const

export const PROVIDER_TYPES = [
  'anthropic', 'google', 'openai', 'openai-compatible', 'custom',
] as const

export const LORE_CATEGORIES = ['world', 'characters', 'style'] as const

export const USER_DATA_DIR = '~/NovelForge'
export const PROJECTS_DIR = 'projects'
export const DEFAULT_TARGET_WORDS = 1_000_000
export const DEFAULT_CHAPTER_WORDS = 3000
export const DEFAULT_MAX_TOKENS = 16000

export const NOVELFORGE_VERSION = '0.1.0'
```

- [ ] **Step 9: Barrel export — packages/shared/src/index.ts**

```typescript
export * from './types/project'
export * from './types/chapter'
export * from './types/lore'
export * from './types/pipeline'
export * from './types/ai'
export * from './types/settings'
export * from './constants'
```

- [ ] **Step 10: 验证 + Commit**

```bash
cd packages/shared && pnpm install
pnpm typecheck
# Expected: 无错误
git add packages/shared/
git commit -m "feat(shared): 核心类型定义包 — Project/Chapter/Lore/Pipeline/AI/Settings"
```

---

## Group 2A: 数据层 (依赖 Group 1B)

### Task 2A.1: Database 层

**Files:**
- Create: `apps/desktop/src/main/db/connection.ts`
- Create: `apps/desktop/src/main/db/migrations/001-init.sql`
- Create: `apps/desktop/src/main/db/queries/projects.ts`
- Create: `apps/desktop/src/main/db/queries/chapters.ts`
- Create: `apps/desktop/src/main/db/queries/lore.ts`
- Create: `apps/desktop/src/main/db/queries/pipeline.ts`
- Create: `apps/desktop/src/main/db/queries/ai-logs.ts`
- Create: `apps/desktop/src/main/db/queries/settings.ts`

- [ ] **Step 1: migration SQL — apps/desktop/src/main/db/migrations/001-init.sql**

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  sub_genre TEXT,
  target_words INTEGER NOT NULL DEFAULT 1000000,
  synopsis TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS volumes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  synopsis TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  target_chapters INTEGER NOT NULL DEFAULT 40
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  volume_id TEXT NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  word_count INTEGER NOT NULL DEFAULT 0,
  target_words INTEGER NOT NULL DEFAULT 3000,
  pov TEXT,
  characters TEXT DEFAULT '[]',
  locations TEXT DEFAULT '[]',
  events TEXT DEFAULT '[]',
  foreshadow_planted TEXT DEFAULT '[]',
  foreshadow_resolved TEXT DEFAULT '[]',
  ai_model TEXT,
  ai_tokens INTEGER NOT NULL DEFAULT 0,
  ai_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revised_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lore_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('world', 'characters', 'style')),
  key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  auto_generated INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS context_layers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK(level IN ('L0', 'L1', 'L2')),
  volume_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_chapter_ids TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle',
  phase TEXT NOT NULL DEFAULT 'idle',
  current_volume_id TEXT,
  current_chapter_id TEXT,
  steps TEXT DEFAULT '[]',
  total_chapters INTEGER NOT NULL DEFAULT 0,
  completed_chapters INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_call_logs (
  id TEXT PRIMARY KEY,
  pipeline_run_id TEXT,
  role TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id TEXT,
  volume_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('chapter', 'volume')),
  status TEXT NOT NULL DEFAULT 'pending',
  ai_review TEXT,
  human_review TEXT,
  human_decision TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: connection.ts**

```typescript
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
```

- [ ] **Step 3: queries 层示例 — projects.ts**

```typescript
import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { Project } from '@novelforge/shared'

export function createProject(db: Database.Database, data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
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

export function deleteProject(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    author: row.author,
    genre: row.genre,
    subGenre: row.sub_genre ?? undefined,
    targetWords: row.target_words,
    synopsis: row.synopsis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

- [ ] **Step 4: 其余 query 文件同理 (chapters, lore, pipeline, ai-logs, settings)** — 因篇幅限制，它们遵循相同的 row→TypeScript 对象转换模式，完整实现在对应的 task 文件中

- [ ] **Step 5: 验证 + Commit**

```bash
pnpm typecheck
git add apps/desktop/src/main/db/
git commit -m "feat(db): SQLite 数据库层 — 连接管理/迁移/全表 CRUD queries"
```

### Task 2A.2: FileStore 文件系统管理

**Files:**
- Create: `apps/desktop/src/main/store/config.ts`
- Create: `apps/desktop/src/main/store/file-store.ts`

- [ ] **Step 1: config.ts — 应用级配置管理**

```typescript
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { AppSettings } from '@novelforge/shared'

const CONFIG_FILE = 'config.json'

export function getNovelForgeDir(): string {
  const home = app.getPath('home')
  return path.join(home, 'NovelForge')
}

export function getConfigPath(): string {
  return path.join(getNovelForgeDir(), CONFIG_FILE)
}

export function loadConfig(): AppSettings {
  const dir = getNovelForgeDir()
  fs.mkdirSync(dir, { recursive: true })

  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    const defaults: AppSettings = {
      theme: 'dark',
      language: 'zh-CN',
      fontSize: 16,
      autoSaveIntervalMs: 30000,
      models: [],
      roleBindings: [],
      shortcuts: {},
    }
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2))
    return defaults
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

export function saveConfig(config: AppSettings): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
}
```

- [ ] **Step 2: file-store.ts — 项目文件 I/O**

```typescript
import fs from 'fs'
import path from 'path'
import { getNovelForgeDir } from './config'
import { app } from 'electron'

export class FileStore {
  private projectDir: string

  constructor(projectName: string) {
    this.projectDir = path.join(getNovelForgeDir(), 'projects', projectName)
  }

  private ensureDir(...segments: string[]): string {
    const dir = path.join(this.projectDir, ...segments)
    fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  // Lore
  readLoreFile(category: string, key: string): string {
    const filePath = path.join(this.projectDir, 'lore', category, `${key}.md`)
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeLoreFile(category: string, key: string, content: string): void {
    this.ensureDir('lore', category)
    fs.writeFileSync(path.join(this.projectDir, 'lore', category, `${key}.md`), content)
  }

  // Outline
  readOutlineFile(name: string): string {
    const filePath = path.join(this.projectDir, 'outline', `${name}.md`)
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeOutlineFile(name: string, content: string): void {
    this.ensureDir('outline')
    fs.writeFileSync(path.join(this.projectDir, 'outline', `${name}.md`), content)
  }

  // Manuscript
  readChapterContent(volumeNum: number, chapterNum: number): { meta: any; body: string } {
    const dir = path.join(this.projectDir, 'manuscript', `vol-${volumeNum}`)
    const filePath = path.join(dir, `ch-${String(chapterNum).padStart(3, '0')}.md`)
    if (!fs.existsSync(filePath)) return { meta: {}, body: '' }

    const raw = fs.readFileSync(filePath, 'utf-8')
    return parseFrontmatter(raw)
  }

  writeChapterContent(volumeNum: number, chapterNum: number, meta: Record<string, unknown>, body: string): void {
    this.ensureDir('manuscript', `vol-${volumeNum}`)
    const yaml = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')
    const content = `---\n${yaml}\n---\n\n${body}`
    const fileName = `ch-${String(chapterNum).padStart(3, '0')}.md`
    fs.writeFileSync(path.join(this.projectDir, 'manuscript', `vol-${volumeNum}`, fileName), content)
  }

  // Workspace
  readWorkspaceFile(name: string): string {
    const filePath = path.join(this.projectDir, 'workspace', 'current', `${name}.md`)
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeWorkspaceFile(name: string, content: string): void {
    this.ensureDir('workspace', 'current')
    fs.writeFileSync(path.join(this.projectDir, 'workspace', 'current', `${name}.md`), content)
  }

  deleteProjectDir(): void {
    if (fs.existsSync(this.projectDir)) {
      fs.rmSync(this.projectDir, { recursive: true, force: true })
    }
  }
}

function parseFrontmatter(raw: string): { meta: any; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const [k, ...rest] = line.split(':')
    if (k) {
      try { meta[k.trim()] = JSON.parse(rest.join(':').trim()) }
      catch { meta[k.trim()] = rest.join(':').trim() }
    }
  }
  return { meta, body: match[2].trimStart() }
}
```

- [ ] **Step 3: 验证 + Commit**

```bash
pnpm typecheck
git add apps/desktop/src/main/store/
git commit -m "feat(store): FileStore — 项目文件系统 I/O + Markdown frontmatter 解析"
```

---

## Group 2B: AI 层 (依赖 Group 1B, 可并行于 Group 2A)

### Task 2B.1: AIClient + Provider 抽象

**Files:**
- Create: `apps/desktop/src/main/ai/provider.ts` (AIChatProvider 接口复用 shared 包)
- Create: `apps/desktop/src/main/ai/client.ts`
- Create: `apps/desktop/src/main/ai/crypto.ts`
- Create: `apps/desktop/src/main/ai/cost-tracker.ts`

- [ ] **Step 1: crypto.ts — API Key 加密存储**

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = crypto.scryptSync('novelforge-desktop-secret', 'salt', 32)

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  })
}

export function decryptApiKey(encrypted: string): string {
  const { iv, data, tag } = JSON.parse(encrypted)
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()])
  return decrypted.toString('utf-8')
}
```

- [ ] **Step 2: client.ts — 统一 AI 调用入口**

```typescript
import type { ModelConfig, ChatResult, StreamChunk, AICallLog } from '@novelforge/shared'
import { createProvider } from './providers'
import { CostTracker } from './cost-tracker'

export class AIClient {
  private costTracker = new CostTracker()

  async generate(
    modelConfig: ModelConfig,
    messages: Array<{ role: string; content: string }>,
    opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}
  ): Promise<ChatResult> {
    const provider = createProvider(modelConfig)
    const start = Date.now()
    const result = await provider.chat(messages, {
      model: modelConfig.modelId,
      ...opts,
    })
    const durationMs = Date.now() - start
    this.costTracker.record(result, modelConfig.id, durationMs)
    return result
  }

  async *generateStream(
    modelConfig: ModelConfig,
    messages: Array<{ role: string; content: string }>,
    opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}
  ): AsyncIterable<StreamChunk> {
    const provider = createProvider(modelConfig)
    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0
    let costUsd = 0

    for await (const chunk of provider.chatStream(messages, { model: modelConfig.modelId, ...opts })) {
      if (chunk.type === 'text') fullContent += chunk.content ?? ''
      if (chunk.type === 'done') {
        inputTokens = chunk.inputTokens ?? 0
        outputTokens = chunk.outputTokens ?? 0
        costUsd = chunk.costUsd ?? 0
      }
      yield chunk
    }

    this.costTracker.record({ content: fullContent, inputTokens, outputTokens, costUsd, durationMs: 0 }, modelConfig.id, 0)
  }

  getLogs(): AICallLog[] {
    return this.costTracker.getLogs()
  }

  getTotalCost(): number {
    return this.costTracker.getTotalCost()
  }
}
```

- [ ] **Step 3: cost-tracker.ts**

```typescript
import { v4 as uuid } from 'uuid'
import type { AICallLog, ChatResult } from '@novelforge/shared'

export class CostTracker {
  private logs: AICallLog[] = []

  record(result: ChatResult, modelId: string, durationMs: number): void {
    this.logs.push({
      id: uuid(),
      role: '',
      modelId,
      provider: 'anthropic',
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
      durationMs,
      status: 'success',
      createdAt: new Date().toISOString(),
    })
  }

  getLogs(): AICallLog[] { return this.logs }
  getTotalCost(): number {
    return this.logs.reduce((sum, l) => sum + l.costUsd, 0)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/ai/
git commit -m "feat(ai): AIClient 统一调用入口 + API Key 加密 + 成本追踪器"
```

### Task 2B.2: Anthropic Provider

**Files:**
- Create: `apps/desktop/src/main/ai/providers/index.ts`
- Create: `apps/desktop/src/main/ai/providers/anthropic.ts`

- [ ] **Step 1: providers/index.ts — provider factory**

```typescript
import type { ModelConfig, AIChatProvider } from '@novelforge/shared'
import { AnthropicProvider } from './anthropic'
import { GoogleProvider } from './google'
import { OpenAIProvider } from './openai'
import { OpenAICompatibleProvider } from './openai-compatible'

export function createProvider(config: ModelConfig): AIChatProvider {
  switch (config.provider) {
    case 'anthropic': return new AnthropicProvider(config)
    case 'google': return new GoogleProvider(config)
    case 'openai': return new OpenAIProvider(config)
    case 'openai-compatible': return new OpenAICompatibleProvider(config)
    case 'custom': return new OpenAICompatibleProvider(config)
    default: throw new Error(`Unknown provider: ${config.provider}`)
  }
}
```

- [ ] **Step 2: anthropic.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class AnthropicProvider implements AIChatProvider {
  private client: Anthropic

  constructor(private config: ModelConfig) {
    this.client = new Anthropic({ apiKey: decryptApiKey(config.apiKey) })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const systemMsg = messages.find(m => m.role === 'system')?.content
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const resp = await this.client.messages.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      system: systemMsg,
      messages: userMsgs,
    }, { signal: opts.signal })

    const inputTokens = resp.usage.input_tokens
    const outputTokens = resp.usage.output_tokens
    const costUsd = this.computeCost(inputTokens, outputTokens)

    return {
      content: resp.content.map(b => (b.type === 'text' ? b.text : '')).join(''),
      inputTokens,
      outputTokens,
      costUsd,
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const systemMsg = messages.find(m => m.role === 'system')?.content
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = this.client.messages.stream({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      system: systemMsg,
      messages: userMsgs,
    })

    let inputTokens = 0
    let outputTokens = 0

    for await (const event of stream) {
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', content: event.delta.text }
      }
      if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens
      }
    }

    const costUsd = this.computeCost(inputTokens, outputTokens)
    yield { type: 'done', inputTokens, outputTokens, costUsd }
  }

  async models() {
    return [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ]
  }

  async validate() {
    try {
      await this.client.messages.create({
        model: this.config.modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      })
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  private computeCost(inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { in: number; out: number }> = {
      'claude-sonnet-4-6': { in: 3, out: 15 },
      'claude-opus-4-7': { in: 15, out: 75 },
      'claude-haiku-4-5': { in: 0.8, out: 4 },
    }
    const p = pricing[this.config.modelId] ?? { in: 3, out: 15 }
    return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/ai/providers/
git commit -m "feat(ai): Anthropic Provider — chat/stream/models/validate + 实时定价计算"
```

### Task 2B.3: OpenAI + OpenAI-Compatible Provider

**Files:**
- Create: `apps/desktop/src/main/ai/providers/openai.ts`
- Create: `apps/desktop/src/main/ai/providers/openai-compatible.ts`

- [ ] **Step 1: openai.ts**

```typescript
import OpenAI from 'openai'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class OpenAIProvider implements AIChatProvider {
  private client: OpenAI

  constructor(private config: ModelConfig) {
    this.client = new OpenAI({ apiKey: decryptApiKey(config.apiKey) })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const resp = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
    }, { signal: opts.signal })

    const inputTokens = resp.usage?.prompt_tokens ?? 0
    const outputTokens = resp.usage?.completion_tokens ?? 0
    return {
      content: resp.choices[0]?.message?.content ?? '',
      inputTokens,
      outputTokens,
      costUsd: this.computeCost(inputTokens, outputTokens),
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      stream: true,
    }, { signal: opts.signal })

    let content = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      content += delta
      yield { type: 'text', content: delta }
    }

    const estimateOutputTokens = Math.ceil(content.length / 4)
    yield { type: 'done', inputTokens: 0, outputTokens: estimateOutputTokens, costUsd: 0 }
  }

  async models() {
    const resp = await this.client.models.list()
    return resp.data.map(m => ({ id: m.id, name: m.id }))
  }

  async validate() {
    try {
      await this.client.models.list()
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  private computeCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10
  }
}
```

- [ ] **Step 2: openai-compatible.ts**

```typescript
import OpenAI from 'openai'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class OpenAICompatibleProvider implements AIChatProvider {
  private client: OpenAI

  constructor(private config: ModelConfig) {
    this.client = new OpenAI({
      apiKey: decryptApiKey(config.apiKey),
      baseURL: config.baseURL ?? 'https://api.openai.com/v1',
    })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const resp = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
    }, { signal: opts.signal })

    return {
      content: resp.choices[0]?.message?.content ?? '',
      inputTokens: resp.usage?.prompt_tokens ?? 0,
      outputTokens: resp.usage?.completion_tokens ?? 0,
      costUsd: 0, // 兼容模式不计算价格（未知模型定价）
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: opts.model ?? this.config.modelId,
      max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.7,
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      stream: true,
    }, { signal: opts.signal })

    let content = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      content += delta
      yield { type: 'text', content: delta }
    }
    yield { type: 'done', inputTokens: 0, outputTokens: Math.ceil(content.length / 4), costUsd: 0 }
  }

  async models() {
    try {
      const resp = await this.client.models.list()
      return resp.data.map(m => ({ id: m.id, name: m.id }))
    } catch {
      return []
    }
  }

  async validate() {
    try {
      await this.client.models.list()
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/ai/providers/openai.ts apps/desktop/src/main/ai/providers/openai-compatible.ts
git commit -m "feat(ai): OpenAI + OpenAI-Compatible Provider — 覆盖 GPT/DeepSeek/通义/Ollama"
```

### Task 2B.4: Google Gemini Provider

**Files:**
- Create: `apps/desktop/src/main/ai/providers/google.ts`

- [ ] **Step 1: google.ts**

```typescript
import { GoogleGenAI } from '@google/genai'
import type { ModelConfig, AIChatProvider, ChatResult, StreamChunk } from '@novelforge/shared'
import { decryptApiKey } from '../crypto'

export class GoogleProvider implements AIChatProvider {
  private client: GoogleGenAI

  constructor(private config: ModelConfig) {
    this.client = new GoogleGenAI({ apiKey: decryptApiKey(config.apiKey) })
  }

  async chat(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): Promise<ChatResult> {
    const start = Date.now()
    const model = this.client.getGenerativeModel({
      model: opts.model ?? this.config.modelId,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? this.config.maxTokens ?? 16000,
        temperature: opts.temperature ?? 0.7,
      },
    })

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const resp = await model.generateContent({ contents })

    const text = resp.response?.text() ?? ''
    return {
      content: text,
      inputTokens: 0,
      outputTokens: Math.ceil(text.length / 4),
      costUsd: 0, // Gemini 定价复杂，简化处理
      durationMs: Date.now() - start,
    }
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, opts: {
    model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal
  }): AsyncIterable<StreamChunk> {
    const model = this.client.getGenerativeModel({
      model: opts.model ?? this.config.modelId,
    })
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const stream = await model.generateContentStream({ contents })

    let fullText = ''
    for await (const chunk of stream) {
      const text = chunk.text ?? ''
      fullText += text
      yield { type: 'text', content: text }
    }
    yield { type: 'done', inputTokens: 0, outputTokens: Math.ceil(fullText.length / 4), costUsd: 0 }
  }

  async models() {
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ]
  }

  async validate() {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.modelId })
      await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/ai/providers/google.ts
git commit -m "feat(ai): Google Gemini Provider — 支持 Pro/Flash 模型 + 1M+ 长上下文"
```

### Task 2B.5: 模型配置管理器

**Files:**
- Create: `apps/desktop/src/main/ai/model-manager.ts`

- [ ] **Step 1: model-manager.ts**

```typescript
import type { ModelConfig, RoleModelBinding } from '@novelforge/shared'
import { createProvider } from './providers'
import { loadConfig, saveConfig } from '../store/config'

export class ModelManager {
  private config = loadConfig()

  listModels(): ModelConfig[] {
    return this.config.models.filter(m => m.enabled)
  }

  addModel(model: ModelConfig): void {
    const idx = this.config.models.findIndex(m => m.id === model.id)
    if (idx >= 0) {
      this.config.models[idx] = model
    } else {
      this.config.models.push(model)
    }
    saveConfig(this.config)
  }

  removeModel(id: string): void {
    this.config.models = this.config.models.filter(m => m.id !== id)
    saveConfig(this.config)
  }

  getModel(id: string): ModelConfig | undefined {
    return this.config.models.find(m => m.id === id)
  }

  async testConnection(model: ModelConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      const provider = createProvider(model)
      return await provider.validate()
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  async fetchModelList(model: ModelConfig): Promise<string[]> {
    try {
      const provider = createProvider(model)
      const models = await provider.models()
      return models.map(m => m.id)
    } catch {
      return []
    }
  }

  getBinding(roleId: string): ModelConfig | undefined {
    const binding = this.config.roleBindings.find(b => b.roleId === roleId)
    const modelId = binding?.primaryModelId ?? this.config.defaultFallbackModelId
    if (!modelId) return undefined
    return this.getModel(modelId)
  }

  setBinding(roleId: string, primaryModelId: string, fallbackModelId?: string): void {
    const idx = this.config.roleBindings.findIndex(b => b.roleId === roleId)
    const binding: RoleModelBinding = { roleId, primaryModelId, fallbackModelId }
    if (idx >= 0) {
      this.config.roleBindings[idx] = binding
    } else {
      this.config.roleBindings.push(binding)
    }
    saveConfig(this.config)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/ai/model-manager.ts
git commit -m "feat(ai): ModelManager — 模型 CRUD/Test Connection/拉取模型列表/角色绑定"
```

---

## Group 3A: Prompt 模板库 (依赖 Group 2B)

### Task 3A: @novelforge/prompts

**Files:**
- Create: `packages/prompts/package.json`
- Create: `packages/prompts/tsconfig.json`
- Create: `packages/prompts/src/roles/architect.ts`
- Create: `packages/prompts/src/roles/main-writer.ts`
- Create: `packages/prompts/src/roles/critic.ts`
- Create: `packages/prompts/src/roles/continuity.ts`
- Create: `packages/prompts/src/roles/character-advocate.ts`
- Create: `packages/prompts/src/roles/atmosphere.ts`
- Create: `packages/prompts/src/roles/revise.ts`
- Create: `packages/prompts/src/roles/summary.ts`
- Create: `packages/prompts/src/pipeline/decide.ts`
- Create: `packages/prompts/src/pipeline/create-brief.ts`
- Create: `packages/prompts/src/pipeline/update-state.ts`
- Create: `packages/prompts/src/lore/update-character.ts`
- Create: `packages/prompts/src/lore/update-foreshadow.ts`
- Create: `packages/prompts/src/lore/generate-summary.ts`
- Create: `packages/prompts/src/lore/refresh-context.ts`
- Create: `packages/prompts/src/index.ts`
- Create: `packages/prompts/src/system-prompts.ts`

- [ ] **Step 1: packages/prompts/package.json**

```json
{
  "name": "@novelforge/prompts",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": { "@novelforge/shared": "workspace:*" }
}
```

- [ ] **Step 2: system-prompts.ts — 系统级角色定义**

```typescript
export const SYSTEM_PROMPTS = {
  showrunner: `你是一位经验丰富的小说制片人。你的职责是：
1. 根据大纲决定下一章要写什么
2. 下发章节任务书（chapter brief），明确本章要完成的叙事目标
3. 评估每章完成质量，决定是否需要重写
4. 管理管线进度，确保按时完成全书目标
你只输出结构化决策，不写正文。`,

  architect: `你是一位资深故事架构师。你的职责是：
1. 根据章节任务书设计章节结构
2. 划分场景，标注每个场景的功能（铺垫/冲突/转折/收束）
3. 设计节奏曲线（高潮/低谷分布）
4. 明确场景视角和焦点角色
输出格式：章节结构稿（Markdown），包含场景列表和节奏标注。`,

  main_writer: `你是一位专业小说作家。你的职责是：
1. 根据结构稿撰写完整正文
2. 使用生动的描写和自然的对话
3. 保持风格一致，遵守风格指南
4. 达到目标字数（默认 3000 字/章）
输出格式：正文文本（Markdown），包含 # 章节标题 和段落内容。`,

  character_advocate: `你是一位角色代言人。你的职责是：
1. 以指定角色的视角审视当前章节
2. 检查该角色的行为、对话是否符合同人设
3. 提出角色一致性的修改建议
只输出不一致之处和修改建议，不输出完整文章。`,

  atmosphere: `你是一位氛围渲染师。你的职责是：
1. 审视章节的环境描写、情感基调、文风一致性
2. 检查描写是否充分、感官细节是否到位
3. 提出氛围改进建议
只输出改进建议，不输出完整文章。`,

  critic: `你是一位挑剔的读者/批评家。你的职责是：
1. 以读者视角评估章节的趣味性、可读性、节奏感
2. 指出剧情是否吸引人、角色是否立体
3. 找出无聊、拖沓或不合理的地方
只输出审查意见，不输出完整文章。`,

  continuity: `你是一位连续性审查员。你的职责是：
1. 检查新章节与已有内容是否存在事实矛盾
2. 检查战力/境界体系是否一致
3. 检查时间线、地点转换是否合理
4. 检查伏笔回收是否完整
只输出矛盾点和修正建议，不输出完整文章。`,

  revise: `你是一位修订编辑。你的职责是：
1. 合并批评家和连续性审查的意见
2. 对初稿进行精确修订
3. 保持原作者文风，不做过度修改
4. 只修改有问题的地方，不要重写全文
输出格式：修订后的完整正文（Markdown）。`,

  summary: `你是一位内容摘要师。你的职责是：
1. 根据章节内容生成简洁摘要（200 字以内）
2. 提取本章关键信息（新角色、新地点、伏笔、重要事件）
3. 更新角色状态描述
输出格式：结构化摘要。`,
}
```

- [ ] **Step 3: 角色 Prompt 模板示例 — architect.ts**

```typescript
import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function architectPrompt(opts: {
  chapterBrief: string
  volumeOutline: string
  contextL0: string
  contextL1: string
  styleGuide: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.architect,
    messages: [{
      role: 'user',
      content: `
## 章节任务书
${opts.chapterBrief}

## 本卷大纲
${opts.volumeOutline}

## 全局上下文
${opts.contextL0}

## 本卷上下文
${opts.contextL1}

## 风格指南
${opts.styleGuide}

请输出本章的结构稿（包含场景划分、节奏曲线、视角标注）。
`.trim(),
    }],
    config: { maxTokens: 8000, temperature: 0.6 },
  }
}
```

- [ ] **Step 4: 其余 14 个 Prompt 模板函数** — 遵循相同模式：系统提示词 + 结构化用户消息 + 配置。每个模板函数接收类型安全的 context 参数，输出 PromptTemplate。

- [ ] **Step 5: Barrel export — packages/prompts/src/index.ts**

```typescript
export { SYSTEM_PROMPTS } from './system-prompts'
export { architectPrompt } from './roles/architect'
export { mainWriterPrompt } from './roles/main-writer'
export { criticPrompt } from './roles/critic'
export { continuityPrompt } from './roles/continuity'
export { characterAdvocatePrompt } from './roles/character-advocate'
export { atmospherePrompt } from './roles/atmosphere'
export { revisePrompt } from './roles/revise'
export { summaryPrompt } from './roles/summary'
export { decidePrompt } from './pipeline/decide'
export { createBriefPrompt } from './pipeline/create-brief'
export { updateStatePrompt } from './pipeline/update-state'
export { updateCharacterPrompt } from './lore/update-character'
export { updateForeshadowPrompt } from './lore/update-foreshadow'
export { generateSummaryPrompt } from './lore/generate-summary'
export { refreshContextPrompt } from './lore/refresh-context'
```

- [ ] **Step 6: Commit**

```bash
git add packages/prompts/
git commit -m "feat(prompts): 15+ Prompt 模板函数 — 编剧室全角色 + 管线 + 资料维护"
```

---

## Group 3B: 核心引擎 (依赖 Group 2A + 2B + 3A)

### Task 3B.1: Pipeline 状态机

**Files:**
- Create: `apps/desktop/src/main/engine/pipeline.ts`

- [ ] **Step 1: pipeline.ts**

```typescript
import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import type { PipelineState, PipelinePhase, PipelineStep, WriterRole } from '@novelforge/shared'

export class PipelineEngine extends EventEmitter {
  state: PipelineState

  constructor(private projectId: string, totalChapters: number) {
    super()
    this.state = {
      id: uuid(),
      projectId,
      status: 'idle',
      phase: 'idle',
      steps: [],
      totalChapters,
      completedChapters: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    }
  }

  private transition(phase: PipelinePhase): void {
    this.state.phase = phase
    this.state.status = phase
    this.emit('phase:enter', { phase, timestamp: Date.now() })
  }

  start(): void { this.transition('planning') }

  private addStep(role: WriterRole): string {
    const id = uuid()
    this.state.steps.push({ id, role, status: 'pending' })
    return id
  }

  private updateStep(id: string, update: Partial<PipelineStep>): void {
    const step = this.state.steps.find(s => s.id === id)
    if (step) Object.assign(step, update)
  }

  async executeStep(role: WriterRole, fn: () => Promise<{ tokensUsed: number; costUsd: number }>): Promise<void> {
    const id = this.addStep(role)
    this.updateStep(id, { status: 'running', startedAt: new Date().toISOString() })
    this.emit('step:start', { id, role })

    try {
      const result = await fn()
      this.state.totalTokens += result.tokensUsed
      this.state.totalCostUsd += result.costUsd
      this.updateStep(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
      })
      this.emit('step:complete', { id, role, ...result })
    } catch (e: any) {
      this.updateStep(id, { status: 'failed', error: e.message })
      this.transition('error')
      this.emit('error', { id, role, error: e.message })
      throw e
    }
  }

  pause(): void { this.transition('paused') }
  resume(): void { this.transition('writing') }

  completeChapter(): void {
    this.state.completedChapters++
    if (this.state.completedChapters >= this.state.totalChapters) {
      this.transition('completed')
    }
  }

  getProgress(): { percent: number; estimatedRemainingMs: number } {
    const percent = this.state.totalChapters > 0
      ? Math.round((this.state.completedChapters / this.state.totalChapters) * 100)
      : 0
    const avgMsPerChapter = 600_000 // 保守估计 10 min/章
    const remaining = (this.state.totalChapters - this.state.completedChapters) * avgMsPerChapter
    return { percent, estimatedRemainingMs: remaining }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/engine/pipeline.ts
git commit -m "feat(engine): Pipeline 状态机 — 阶段转换/步骤追踪/进度计算/事件发射"
```

### Task 3B.2: Writers' Room 调度器

**Files:**
- Create: `apps/desktop/src/main/engine/writers-room.ts`

- [ ] **Step 1: writers-room.ts**

```typescript
import { AIClient } from '../ai/client'
import { ModelManager } from '../ai/model-manager'
import { FileStore } from '../store/file-store'
import { Database } from 'better-sqlite3'
import { architectPrompt, mainWriterPrompt, criticPrompt, continuityPrompt, revisePrompt } from '@novelforge/prompts'
import type { ChapterMeta, ModelConfig, PromptTemplate } from '@novelforge/shared'

export class WritersRoom {
  constructor(
    private aiClient: AIClient,
    private modelManager: ModelManager,
    private fileStore: FileStore,
    private db: Database
  ) {}

  private async callRole(role: string, prompt: PromptTemplate, abortSignal?: AbortSignal) {
    const model = this.modelManager.getBinding(role)
    if (!model) throw new Error(`No model configured for role: ${role}`)
    return this.aiClient.generate(model, [
      { role: 'system', content: prompt.system },
      ...prompt.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ], {
      maxTokens: prompt.config.maxTokens,
      temperature: prompt.config.temperature,
      signal: abortSignal,
    })
  }

  async writeChapter(opts: {
    chapterBrief: string
    volumeOutline: string
    contextL0: string
    contextL1: string
    styleGuide: string
    chapterMeta: ChapterMeta
    signal?: AbortSignal
  }) {
    const { chapterBrief, volumeOutline, contextL0, contextL1, styleGuide, chapterMeta, signal } = opts

    // 1. Architect
    const archPrompt = architectPrompt({ chapterBrief, volumeOutline, contextL0, contextL1, styleGuide })
    const structureResult = await this.callRole('architect', archPrompt, signal)
    this.fileStore.writeWorkspaceFile('structure-draft', structureResult.content)

    // 2. Main Writer
    const writerPrompt = mainWriterPrompt({
      structureDraft: structureResult.content,
      chapterBrief,
      contextL0,
      contextL1,
      styleGuide,
      characters: chapterMeta.characters.join(', '),
    })
    const draftResult = await this.callRole('main_writer', writerPrompt, signal)
    this.fileStore.writeWorkspaceFile('draft-v1', draftResult.content)

    // 3. Parallel: Critic + Continuity
    const criticPromptTemplate = criticPrompt({ draftContent: draftResult.content, chapterBrief })
    const continuityPromptTemplate = continuityPrompt({
      draftContent: draftResult.content,
      contextL0,
      contextL1,
      styleGuide,
    })

    const [criticResult, continuityResult] = await Promise.all([
      this.callRole('critic', criticPromptTemplate, signal),
      this.callRole('continuity', continuityPromptTemplate, signal),
    ])

    const reviewNotes = `## 批评家意见\n${criticResult.content}\n\n## 连续性审查\n${continuityResult.content}`
    this.fileStore.writeWorkspaceFile('review-notes', reviewNotes)

    // 4. Revise
    const revisePromptTemplate = revisePrompt({
      draftContent: draftResult.content,
      reviewNotes,
    })
    const finalResult = await this.callRole('revise', revisePromptTemplate, signal)
    this.fileStore.writeWorkspaceFile('draft-final', finalResult.content)

    return {
      structureDraft: structureResult.content,
      draftV1: draftResult.content,
      reviewNotes,
      finalDraft: finalResult.content,
      totalTokens: structureResult.inputTokens + structureResult.outputTokens
        + draftResult.inputTokens + draftResult.outputTokens
        + criticResult.inputTokens + criticResult.outputTokens
        + continuityResult.inputTokens + continuityResult.outputTokens
        + finalResult.inputTokens + finalResult.outputTokens,
      totalCostUsd: structureResult.costUsd + draftResult.costUsd
        + criticResult.costUsd + continuityResult.costUsd + finalResult.costUsd,
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/engine/writers-room.ts
git commit -m "feat(engine): Writers' Room 调度器 — 架构师→主笔→审查→修订完整流程"
```

### Task 3B.3: Lore Engine

**Files:**
- Create: `apps/desktop/src/main/engine/lore-engine.ts`

- [ ] **Step 1: lore-engine.ts**

```typescript
import { AIClient } from '../ai/client'
import { ModelManager } from '../ai/model-manager'
import { FileStore } from '../store/file-store'
import { Database } from 'better-sqlite3'
import { summaryPrompt, updateCharacterPrompt, refreshContextPrompt } from '@novelforge/prompts'
import type { ContextLayer } from '@novelforge/shared'

export class LoreEngine {
  constructor(
    private aiClient: AIClient,
    private modelManager: ModelManager,
    private fileStore: FileStore,
    private db: Database
  ) {}

  async afterChapter(opts: {
    chapterContent: string
    chapterMeta: { number: number; volumeNumber: number; characters: string[] }
    existingL0: string
    existingL1: string
    recentChapterSummaries: string[]
    signal?: AbortSignal
  }) {
    const model = this.modelManager.getBinding('summary')
    if (!model) return

    // 生成章节摘要
    const summaryPromptTemplate = summaryPrompt({ chapterContent: opts.chapterContent })
    const summaryResult = await this.aiClient.generate(model, [
      { role: 'system', content: summaryPromptTemplate.system },
      { role: 'user', content: summaryPromptTemplate.messages[0].content },
    ])

    // 更新 L2 滚动窗口
    const l2Content = [
      ...opts.recentChapterSummaries.slice(-4),
      `Ch.${opts.chapterMeta.number}: ${summaryResult.content}`,
    ].join('\n\n')

    // 刷新 L0 (每 10 章) 和 L1 (每章)
    if (opts.chapterMeta.number % 10 === 0) {
      await this.refreshL0(opts.existingL0, summaryResult.content)
    }
    await this.refreshL1(opts.existingL1, summaryResult.content, opts.chapterMeta.number)

    // 存数据库
    this.upsertContextLayer('L2', l2Content, [opts.chapterMeta.number.toString()])

    return {
      summary: summaryResult.content,
      l2Content,
      costUsd: summaryResult.costUsd,
    }
  }

  private async refreshL0(existing: string, newContent: string) {
    const model = this.modelManager.getBinding('summary')!
    const prompt = refreshContextPrompt({ type: 'L0', existing, newContent })
    const result = await this.aiClient.generate(model, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.messages[0].content },
    ])
    this.upsertContextLayer('L0', result.content, [])
  }

  private async refreshL1(existing: string, newContent: string, chapterNum: number) {
    const model = this.modelManager.getBinding('summary')!
    const prompt = refreshContextPrompt({ type: 'L1', existing, newContent })
    const result = await this.aiClient.generate(model, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.messages[0].content },
    ])
    this.upsertContextLayer('L1', result.content, [chapterNum.toString()])
  }

  private upsertContextLayer(level: string, content: string, sourceIds: string[]): void {
    const existing = this.db.prepare(
      'SELECT id FROM context_layers WHERE level = ?'
    ).get(level) as any

    if (existing) {
      this.db.prepare(
        'UPDATE context_layers SET content = ?, source_chapter_ids = ?, generated_at = datetime(\'now\') WHERE id = ?'
      ).run(content, JSON.stringify(sourceIds), existing.id)
    } else {
      const { v4: uuid } = require('uuid')
      this.db.prepare(
        'INSERT INTO context_layers (id, level, content, source_chapter_ids) VALUES (?, ?, ?, ?)'
      ).run(uuid(), level, content, JSON.stringify(sourceIds))
    }
  }

  getContextLayers(): { L0: string; L1: string; L2: string } {
    const L0 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L0') as any
    const L1 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L1') as any
    const L2 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L2') as any
    return { L0: L0?.content ?? '', L1: L1?.content ?? '', L2: L2?.content ?? '' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/engine/lore-engine.ts
git commit -m "feat(engine): Lore Engine — 四级上下文金字塔 + 每章自动摘要/角色更新/上下文刷新"
```

---

## Group 4: IPC Bridge (依赖 Group 3A + 3B)

### Task 4: IPC 完整桥接

**Files:**
- Rewrite: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/main/ipc/project.ipc.ts`
- Create: `apps/desktop/src/main/ipc/chapter.ipc.ts`
- Create: `apps/desktop/src/main/ipc/lore.ipc.ts`
- Create: `apps/desktop/src/main/ipc/pipeline.ipc.ts`
- Create: `apps/desktop/src/main/ipc/ai.ipc.ts`
- Create: `apps/desktop/src/main/ipc/native.ipc.ts`
- Create: `apps/desktop/src/renderer/lib/ipc-client.ts`

- [ ] **Step 1: preload/index.ts — 完整 API 暴露**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('novelforge', {
  platform: process.platform,
  version: '0.1.0',

  project: {
    list: () => ipcRenderer.invoke('project:list'),
    create: (data: any) => ipcRenderer.invoke('project:create', data),
    open: (id: string) => ipcRenderer.invoke('project:open', id),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
  },

  chapter: {
    list: (projectId: string, volumeId: string) =>
      ipcRenderer.invoke('chapter:list', projectId, volumeId),
    get: (projectId: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:get', projectId, chapterId),
    getContent: (projectId: string, volumeNum: number, chapterNum: number) =>
      ipcRenderer.invoke('chapter:getContent', projectId, volumeNum, chapterNum),
    save: (projectId: string, volumeNum: number, chapterNum: number, meta: any, body: string) =>
      ipcRenderer.invoke('chapter:save', projectId, volumeNum, chapterNum, meta, body),
  },

  lore: {
    list: (projectId: string, category: string) =>
      ipcRenderer.invoke('lore:list', projectId, category),
    get: (projectId: string, category: string, key: string) =>
      ipcRenderer.invoke('lore:get', projectId, category, key),
    save: (projectId: string, entry: any) =>
      ipcRenderer.invoke('lore:save', projectId, entry),
  },

  pipeline: {
    start: (projectId: string) => ipcRenderer.invoke('pipeline:start', projectId),
    pause: () => ipcRenderer.invoke('pipeline:pause'),
    resume: () => ipcRenderer.invoke('pipeline:resume'),
    stop: () => ipcRenderer.invoke('pipeline:stop'),
    getState: () => ipcRenderer.invoke('pipeline:getState'),
    onEvent: (channel: string, handler: (data: any) => void) => {
      ipcRenderer.on(`pipeline:${channel}`, (_event, data) => handler(data))
    },
  },

  ai: {
    testConnection: (modelConfig: any) =>
      ipcRenderer.invoke('ai:testConnection', modelConfig),
    fetchModels: (modelConfig: any) =>
      ipcRenderer.invoke('ai:fetchModels', modelConfig),
    assist: (modelConfigId: string, prompt: string, selectedText?: string) =>
      ipcRenderer.invoke('ai:assist', modelConfigId, prompt, selectedText),
    streamAssist: (modelConfigId: string, prompt: string, selectedText?: string) =>
      ipcRenderer.invoke('ai:streamAssist', modelConfigId, prompt, selectedText),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    addModel: (model: any) => ipcRenderer.invoke('settings:addModel', model),
    removeModel: (id: string) => ipcRenderer.invoke('settings:removeModel', id),
  },

  native: {
    showOpenDialog: (opts: any) => ipcRenderer.invoke('native:openDialog', opts),
    showSaveDialog: (opts: any) => ipcRenderer.invoke('native:saveDialog', opts),
    exportProject: (projectId: string, format: string) =>
      ipcRenderer.invoke('native:export', projectId, format),
  },
})
```

- [ ] **Step 2: IPC handlers 注册 — 更新 main/index.ts**

```typescript
// 在 main/index.ts 的 app.whenReady() 中添加：
import { registerProjectIpc } from './ipc/project.ipc'
import { registerChapterIpc } from './ipc/chapter.ipc'
import { registerLoreIpc } from './ipc/lore.ipc'
import { registerPipelineIpc } from './ipc/pipeline.ipc'
import { registerAiIpc } from './ipc/ai.ipc'
import { registerNativeIpc } from './ipc/native.ipc'

// 注册所有 IPC handlers
registerProjectIpc()
registerChapterIpc()
registerLoreIpc()
registerPipelineIpc()
registerAiIpc()
registerNativeIpc()
```

- [ ] **Step 3: ipc-client.ts — 渲染进程调用封装**

```typescript
type NovelForgeAPI = typeof window.novelforge

export function getAPI(): NovelForgeAPI {
  if (!window.novelforge) {
    throw new Error('NovelForge API not available. Are you running inside Electron?')
  }
  return window.novelforge
}

export const api = {
  get project() { return getAPI().project },
  get chapter() { return getAPI().chapter },
  get lore() { return getAPI().lore },
  get pipeline() { return getAPI().pipeline },
  get ai() { return getAPI().ai },
  get settings() { return getAPI().settings },
  get native() { return getAPI().native },
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/preload/ apps/desktop/src/main/ipc/ apps/desktop/src/renderer/lib/ipc-client.ts apps/desktop/src/main/index.ts
git commit -m "feat(ipc): 完整 IPC 桥接 — 6 个 IPC 域名 + contextBridge API + 渲染端客户端"
```

---

## Group 5A: UI 基础 — 布局与面板 (依赖 Group 4)

### Task 5A.1: Studio 四面板布局

**Files:**
- Create: `apps/desktop/src/renderer/layouts/studio-layout.tsx`

- [ ] **Step 1: studio-layout.tsx**

```typescript
import { useState } from 'react'
import { NavigationPanel } from '@/panels/navigator'
import { EditorPanel } from '@/panels/editor'
import { InspectorPanel } from '@/panels/inspector'
import { CommandBar } from '@/panels/command-bar'
import { StatusBar } from '@/components/status-bar'

export function StudioLayout() {
  const [leftWidth, setLeftWidth] = useState(240)
  const [rightWidth, setRightWidth] = useState(280)
  const [viewMode, setViewMode] = useState<'writing' | 'command' | 'review'>('writing')
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-nf-bg text-nf-text">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Navigation */}
        <div style={{ width: leftWidth }} className="flex-shrink-0 border-r border-nf-border">
          <NavigationPanel />
        </div>

        {/* Resizer */}
        <div
          className="w-1 cursor-col-resize bg-nf-border hover:bg-nf-accent/50 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startW = leftWidth
            const onMove = (e: MouseEvent) => setLeftWidth(Math.max(180, Math.min(400, startW + e.clientX - startX)))
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />

        {/* Center: Editor */}
        <div className="flex-1 overflow-hidden">
          <EditorPanel viewMode={viewMode} onCommandOpen={() => setCommandOpen(true)} />
        </div>

        {/* Right Resizer */}
        <div
          className="w-1 cursor-col-resize bg-nf-border hover:bg-nf-accent/50 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startW = rightWidth
            const onMove = (e: MouseEvent) => setRightWidth(Math.max(200, Math.min(500, startW - e.clientX + startX)))
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />

        {/* Right: Inspector */}
        <div style={{ width: rightWidth }} className="flex-shrink-0 border-l border-nf-border">
          <InspectorPanel viewMode={viewMode} />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Command Bar Modal */}
      {commandOpen && <CommandBar onClose={() => setCommandOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/layouts/
git commit -m "feat(ui): 四面板 Studio 布局 — 可拖拽分隔线 + 三种视图模式切换"
```

### Task 5A.2: Navigation + Editor + Inspector + CommandBar Panels

因篇幅限制，以下是各 Panel 的核心接口和文件列表。每个 Panel 在实施时由 subagent 独立开发。

**Files:**
- `apps/desktop/src/renderer/panels/navigator/index.tsx` — 树形导航（大纲/角色/世界观/成稿）
- `apps/desktop/src/renderer/panels/navigator/tree-node.tsx` — 可展开/右键菜单/拖拽的树节点
- `apps/desktop/src/renderer/panels/editor/index.tsx` — Markdown 编辑器（CodeMirror 6）
- `apps/desktop/src/renderer/panels/editor/toolbar.tsx` — 编辑器工具栏（保存/字数/分屏切换）
- `apps/desktop/src/renderer/panels/inspector/index.tsx` — 上下文感知辅助面板
- `apps/desktop/src/renderer/panels/inspector/chapter-info.tsx` — 章节元信息
- `apps/desktop/src/renderer/panels/inspector/ai-stream.tsx` — AI 实时输出展示
- `apps/desktop/src/renderer/panels/command-bar/index.tsx` — Ctrl+J AI 指令面板
- `apps/desktop/src/renderer/components/status-bar.tsx` — 底部状态栏

**Commit (多步):**
```bash
git add apps/desktop/src/renderer/panels/navigator/
git commit -m "feat(ui): Navigation Panel — 树形导航 + 拖拽排序 + 右键菜单"

git add apps/desktop/src/renderer/panels/editor/
git commit -m "feat(ui): Editor Panel — CodeMirror 6 Markdown 编辑器 + 预览切换 + 打字机滚动"

git add apps/desktop/src/renderer/panels/inspector/
git commit -m "feat(ui): Inspector Panel — 上下文感知 + AI 输出流 + 章节信息卡片"

git add apps/desktop/src/renderer/panels/command-bar/
git commit -m "feat(ui): Command Bar — Ctrl+J AI 指令面板 + 自定义 Prompt"

git add apps/desktop/src/renderer/components/status-bar.tsx
git commit -m "feat(ui): StatusBar — 字数/章节/管线进度 + 视图模式切换"
```

---

## Group 5B: Pages + Stores (依赖 Group 4, 可并行于 Group 5A)

### Task 5B.1: Settings 页面 — 模型配置

**Files:**
- `apps/desktop/src/renderer/settings/model-settings.tsx`
- `apps/desktop/src/renderer/settings/add-model-dialog.tsx`
- `apps/desktop/src/renderer/settings/role-binding.tsx`
- `apps/desktop/src/renderer/settings/general-settings.tsx`

核心实现：ModelSettings 卡片列表 + AddModelDialog（Provider/Key/URL/ModelID + Test Connection）+ RoleBinding 角色-模型下拉分配 + GeneralSettings 主题/语言/字体。

### Task 5B.2: 项目初始化向导

**Files:**
- `apps/desktop/src/renderer/onboarding/welcome.tsx` — 双模式选择
- `apps/desktop/src/renderer/onboarding/quick-wizard.tsx` — 5 步向导
- `apps/desktop/src/renderer/onboarding/advanced-wizard.tsx` — 7 类高级配置
- `apps/desktop/src/renderer/onboarding/steps/basic-info.tsx`
- `apps/desktop/src/renderer/onboarding/steps/ai-models.tsx`
- `apps/desktop/src/renderer/onboarding/steps/protagonist.tsx`
- `apps/desktop/src/renderer/onboarding/steps/world-building.tsx`
- `apps/desktop/src/renderer/onboarding/steps/outline.tsx` (advanced only)
- `apps/desktop/src/renderer/onboarding/steps/style-guide.tsx` (advanced only)

### Task 5B.3: 管线监控 + 检查点审阅

**Files:**
- `apps/desktop/src/renderer/pipeline/monitor.tsx` — 进度条 + 步骤状态 + AI 实时流
- `apps/desktop/src/renderer/pipeline/checkpoint-review.tsx` — 审阅清单 + 认可/驳回 + 修改建议

### Task 5B.4: 导出页面

**Files:**
- `apps/desktop/src/renderer/export/export-dialog.tsx` — 格式选择 + EPUB 选项 + 水印

### Task 5B.5: Zustand Stores

**Files:**
- `apps/desktop/src/renderer/stores/project-store.ts`
- `apps/desktop/src/renderer/stores/editor-store.ts`
- `apps/desktop/src/renderer/stores/pipeline-store.ts`
- `apps/desktop/src/renderer/stores/settings-store.ts`

```typescript
// 示例 — project-store.ts
import { create } from 'zustand'
import { api } from '@/lib/ipc-client'
import type { Project } from '@novelforge/shared'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  loadProjects: () => Promise<void>
  openProject: (id: string) => Promise<void>
  createProject: (data: any) => Promise<Project>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    const projects = await api.project.list()
    set({ projects, loading: false })
  },

  openProject: async (id) => {
    const project = await api.project.open(id)
    set({ currentProject: project })
  },

  createProject: async (data) => {
    const project = await api.project.create(data)
    set(s => ({ projects: [project, ...s.projects] }))
    return project
  },
}))
```

---

## Group 6: Integration + Polish

### Task 6.1: App 路由集成

将所有 Pages + Layout 连接成可导航的应用。

**Files:** Rewrite `apps/desktop/src/renderer/App.tsx`

```typescript
import { useState } from 'react'
import { StudioLayout } from '@/layouts/studio-layout'
import { WelcomePage } from '@/onboarding/welcome'
import { SettingsPage } from '@/settings/model-settings'
import { ModelSettingsPage } from '@/settings/model-settings'
import { GeneralSettingsPage } from '@/settings/general-settings'

type Page = 'studio' | 'welcome' | 'settings-models' | 'settings-general'

export function App() {
  const [page, setPage] = useState<Page>('welcome')

  return (
    <>
      {page === 'welcome' && <WelcomePage onEnterStudio={() => setPage('studio')} />}
      {page === 'studio' && (
        <StudioLayout
          onOpenSettings={() => setPage('settings-models')}
        />
      )}
      {page === 'settings-models' && (
        <ModelSettingsPage onBack={() => setPage('studio')} />
      )}
      {page === 'settings-general' && (
        <GeneralSettingsPage onBack={() => setPage('studio')} />
      )}
    </>
  )
}
```

### Task 6.2: 键盘快捷键

**Files:** `apps/desktop/src/renderer/hooks/use-shortcuts.ts`

```typescript
import { useEffect } from 'react'

interface ShortcutMap {
  [key: string]: () => void
}

export function useShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      const key = `${mod ? 'Cmd+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`.toLowerCase()

      // Writing mode shortcuts
      if (key === 'cmd+s') { e.preventDefault(); shortcuts.save?.() }
      if (key === 'cmd+j') { e.preventDefault(); shortcuts.aiCommand?.() }
      if (key === 'cmd+b') { e.preventDefault(); shortcuts.bold?.() }
      if (key === 'cmd+i') { e.preventDefault(); shortcuts.italic?.() }
      if (key === 'cmd+shift+f') { e.preventDefault(); shortcuts.focusMode?.() }
      if (key === 'cmd+shift+p') { e.preventDefault(); shortcuts.togglePreview?.() }

      // App-level
      if (key === 'cmd+n') { e.preventDefault(); shortcuts.newProject?.() }
      if (key === 'cmd+o') { e.preventDefault(); shortcuts.openProject?.() }
      if (key === 'cmd+,') { e.preventDefault(); shortcuts.settings?.() }
      if (key === 'cmd+w') { e.preventDefault(); shortcuts.closeProject?.() }
      if (key === 'cmd+shift+e') { e.preventDefault(); shortcuts.export?.() }
      if (key === 'cmd+1') { e.preventDefault(); shortcuts.viewMode?.('writing') }
      if (key === 'cmd+2') { e.preventDefault(); shortcuts.viewMode?.('command') }
      if (key === 'cmd+3') { e.preventDefault(); shortcuts.viewMode?.('review') }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
```

### Task 6.3: 动画与过渡

使用 Tailwind `transition-*` + `animate-*` 实现：
- 面板宽度拖拽：无动画（实时跟随）
- 面板显隐：`transition-all duration-200 ease-out`
- AI 打字效果：逐字显现，CSS animation 模拟
- Toast：`animate-in slide-in-from-top-right duration-300`
- Modal 进入：`animate-in fade-in zoom-in-95 duration-200`
- 骨架屏：`animate-pulse` + `bg-nf-surface`

---

## Group 7: 测试 + 打包

### Task 7.1: Vitest 单元测试

**Files:** 对应每个模块的测试文件
- `tests/unit/prompts/architect.test.ts`
- `tests/unit/ai/client.test.ts`
- `tests/unit/ai/providers.test.ts`
- `tests/unit/engine/pipeline.test.ts`
- `tests/unit/store/file-store.test.ts`

```typescript
// 示例 — pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { PipelineEngine } from '@/main/engine/pipeline'

describe('PipelineEngine', () => {
  it('should start in idle state', () => {
    const engine = new PipelineEngine('test-project', 100)
    expect(engine.state.status).toBe('idle')
    expect(engine.state.phase).toBe('idle')
    expect(engine.state.completedChapters).toBe(0)
  })

  it('should transition to planning on start', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.start()
    expect(engine.state.phase).toBe('planning')
  })

  it('should calculate progress correctly', () => {
    const engine = new PipelineEngine('test-project', 40)
    expect(engine.getProgress().percent).toBe(0)
    engine.completeChapter()
    expect(engine.getProgress().percent).toBe(2) // 1/40 = 2.5 → 2
  })

  it('should emit phase:enter event', () => {
    const engine = new PipelineEngine('test-project', 100)
    let emitted = ''
    engine.on('phase:enter', ({ phase }) => { emitted = phase })
    engine.start()
    expect(emitted).toBe('planning')
  })
})
```

### Task 7.2: Playwright E2E 测试

**Files:** `tests/e2e/full-flow.spec.ts`

元测试覆盖：新建项目→配置模型→启动管线→AI mock 返回→生成章节→审阅→导出

### Task 7.3: electron-builder 打包配置

**Files:** `apps/desktop/electron-builder.yml`

```yaml
appId: com.novelforge.desktop
productName: NovelForge
directories:
  output: release

mac:
  category: public.app-category.productivity
  target:
    - dmg
  icon: resources/icon.icns
  hardenedRuntime: true

win:
  target:
    - nsis
  icon: resources/icon.ico

linux:
  target:
    - AppImage
    - deb
  icon: resources/icon.png
  category: Office

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## 并行执行总览

```
Subagent Group 0 (1 agent, 顺序):
  [0.1: Git 仓库整理] → [0.2: Monorepo 脚手架] → [0.3: Electron Shell]

Subagent Group 1 (3 agents, 并行):
  [1A.1: Tailwind + shadcn/ui]
  [1B: Shared 类型包]
  [2A.1: Database] (在 1B 完成后)
  [2A.2: FileStore] (在 1B 完成后)

Subagent Group 2 (4 agents, 并行):
  [2B.1: AIClient + Provider]
  [2B.2: Anthropic Provider] (在 2B.1 完成后)
  [2B.3: OpenAI Providers] (在 2B.1 完成后)
  [2B.4: Gemini Provider] (在 2B.1 完成后)
  [2B.5: ModelManager] (在 2B.1 完成后)

Subagent Group 3 (2 agents, 并行):
  [3A: Prompt 模板库]
  [3B.1+3B.2+3B.3: Engine] (依赖 Group 2A + 2B + 3A)

Subagent Group 4 (1 agent):
  [4: IPC Bridge 完整]

Subagent Group 5 (5 agents, 并行):
  [5A.1: Studio Layout]
  [5A.2: Panels (Navigator/Editor/Inspector/CommandBar)]
  [5B.1: Settings Page]
  [5B.2: Onboarding Wizard]
  [5B.3+4+5: Pipeline Monitor + Export + Stores]

Subagent Group 6 (2 agents, 并行):
  [6.1+6.2: App Router + Keyboard Shortcuts]
  [6.3: Animations & Polish]

Subagent Group 7 (2 agents, 并行):
  [7.1+7.2: Tests]
  [7.3: electron-builder Packaging]
```

---

## 预估总工时

| Group | Tasks | 预估并行时间 |
|-------|-------|------------|
| G0: Foundation | 3 | 30 min |
| G1: Shell + Types + DB | 4 | 45 min |
| G2: AI Layer | 5 | 60 min |
| G3: Prompts + Engine | 4 | 60 min |
| G4: IPC Bridge | 1 | 30 min |
| G5: UI (6+ panels + 5 pages + 4 stores) | 6 | 90 min |
| G6: Integration + Polish | 2 | 45 min |
| G7: Tests + Packaging | 2 | 45 min |
| **Total (parallel)** | | **~6-7 hours** |

组内并行执行，组间顺序依赖。充分利用 subagent 多进程推进。
