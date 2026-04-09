# Web 控制台设计：NovelForge Console

> AI 小说工程化写作系统的可视化操作与 CLI 编排控制台

## 1. 项目概述

### 1.1 目标

构建一个 Web 应用作为小说写作系统的统一控制面板，实现：

- 可视化管理整个写作工作流（管线状态、编剧室调度、资料文档）
- 远程控制 Claude Code CLI 和 Gemini CLI 的进程生命周期
- 实时流式展示 AI 生成过程和输出
- 配置管理（模型 API Key、管线参数、编剧室配置）
- 检查点审阅与人类决策界面
- 为未来移动端迁移做好架构准备

### 1.2 核心挑战

**CLI 控制问题**：Claude Code CLI 和 Gemini CLI 都是交互式终端工具，不是 HTTP API。需要：

- 管理 CLI 进程的启动、输入、输出、终止
- 捕获实时输出流并推送到浏览器
- 处理 CLI 的认证状态和会话管理
- 并行运行多个 CLI 实例（编剧室多 Agent 并行）
- 进程崩溃检测与自动恢复

### 1.3 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 前端 | Next.js 15 (App Router) + React 19 | 现代全栈框架，SSR/RSC 支持，一人可维护 |
| UI 组件 | shadcn/ui + Tailwind CSS | 高质量组件、易定制、不依赖重型 UI 库 |
| 实时通信 | WebSocket (Socket.IO) | CLI 输出流式推送、状态实时同步 |
| 后端服务 | Node.js 独立进程管理服务 | 与 Next.js 分离，专注 CLI 进程编排 |
| 终端模拟 | node-pty + xterm.js | 完整 PTY 支持，前端终端渲染 |
| 数据库 | SQLite (better-sqlite3) | 轻量、零运维、单文件、足够应对单用户场景 |
| 状态管理 | Zustand | 轻量、简单、适合中小应用 |
| 未来移动端 | React Native / Expo（复用 API 层） | 后端 API 不变，只需新建移动前端 |

### 1.4 整体架构

```
┌────────────────────────────────────────────────────┐
│                   浏览器 / 移动端                     │
│  ┌──────────────────────────────────────────────┐  │
│  │            Next.js 前端（App Router）          │  │
│  │  ┌─────────┬──────────┬──────────┬────────┐  │  │
│  │  │ 仪表盘   │ 编剧室   │ 资料管理  │ 终端   │  │  │
│  │  └─────────┴──────────┴──────────┴────────┘  │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │ HTTP + WebSocket               │
└─────────────────────┼──────────────────────────────┘
                      │
┌─────────────────────┼──────────────────────────────┐
│                API 层（Next.js API Routes）          │
│  ┌──────────────────┴───────────────────────────┐  │
│  │  /api/pipeline/*    管线控制                    │  │
│  │  /api/lore/*        资料 CRUD                  │  │
│  │  /api/manuscript/*  稿件管理                    │  │
│  │  /api/config/*      配置管理                    │  │
│  │  /api/checkpoint/*  检查点审阅                  │  │
│  └──────────────────────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┴───────────────────────────┐  │
│  │         CLI 进程管理服务（核心）                  │  │
│  │  ┌────────────┬────────────┬──────────────┐  │  │
│  │  │ 进程池管理  │ PTY 会话   │ 输出流路由    │  │  │
│  │  │            │            │              │  │  │
│  │  │ claude-1   │ pty-1      │ → WebSocket  │  │  │
│  │  │ claude-2   │ pty-2      │ → WebSocket  │  │  │
│  │  │ gemini-1   │ pty-3      │ → WebSocket  │  │  │
│  │  └────────────┴────────────┴──────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┴───────────────────────────┐  │
│  │              SQLite + 文件系统                   │  │
│  │  DB: 进程记录、任务日志、配置                      │  │
│  │  FS: lore/、outline/、manuscript/、workspace/   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 2. CLI 进程控制方案（核心难点）

### 2.1 问题分析

Claude Code CLI 和 Gemini CLI 的特性：

| 特性 | Claude Code CLI | Gemini CLI |
|------|----------------|------------|
| 调用方式 | `claude` 命令 | `gemini` 命令 |
| 非交互模式 | `claude --print` 支持 | 类似支持 |
| 输入方式 | stdin / --prompt / --prompt-file | 类似 |
| 输出方式 | stdout 流式输出 | stdout 流式输出 |
| 上下文文件 | `--context` 参数 | 类似 |
| 认证 | API Key 或 OAuth | API Key 或 OAuth |
| 并发限制 | 受 API rate limit 约束 | 受 API rate limit 约束 |

### 2.2 进程管理架构

```typescript
// 核心：CLIProcessManager

interface CLIProcess {
  id: string;                    // 唯一进程 ID
  type: 'claude' | 'gemini';    // CLI 类型
  role: string;                  // 编剧室角色（architect、main-writer 等）
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed';
  pty: IPty;                     // node-pty 实例
  startedAt: Date;
  completedAt?: Date;
  exitCode?: number;
  outputBuffer: string;          // 累积输出
  outputFile?: string;           // 输出写入的文件路径
}

interface CLIProcessManager {
  // 启动一个 CLI 进程
  spawn(config: SpawnConfig): Promise<CLIProcess>;

  // 终止进程
  kill(processId: string): Promise<void>;

  // 获取进程状态
  getStatus(processId: string): CLIProcess;

  // 列出所有活跃进程
  listActive(): CLIProcess[];

  // 订阅进程输出流
  subscribe(processId: string, callback: (data: string) => void): void;
}
```

### 2.3 两种 CLI 调用模式

#### 模式 A：非交互批处理模式（主要模式）

用于编剧室的大部分 Agent 调用，CLI 不需要交互，只需要输入 prompt 和上下文，等待输出。

```typescript
// 非交互模式调用 Claude Code CLI
async function spawnClaudeBatch(config: {
  promptFile: string;      // prompt 模板路径
  contextFiles: string[];  // 上下文文件列表
  outputFile: string;      // 输出写入路径
  model?: string;          // 模型选择
  maxTokens?: number;
}): Promise<CLIProcess> {
  const args = [
    '--print',                              // 非交互模式
    '--prompt-file', config.promptFile,
    ...config.contextFiles.flatMap(f => ['--context', f]),
  ];

  if (config.model) {
    args.push('--model', config.model);
  }

  // 使用 node-pty 创建伪终端（兼容 CLI 的终端检测）
  const pty = spawn('claude', args, {
    name: 'xterm-256color',
    cols: 200,
    rows: 50,
    cwd: projectRoot,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: getApiKey('claude'),
    },
  });

  // 输出同时写入文件和缓冲区
  const outputStream = fs.createWriteStream(config.outputFile);
  const process_record: CLIProcess = { /* ... */ };

  pty.onData((data: string) => {
    outputStream.write(data);
    process_record.outputBuffer += data;
    // 通过 WebSocket 推送到前端
    broadcastToSubscribers(process_record.id, data);
  });

  pty.onExit(({ exitCode }) => {
    process_record.status = exitCode === 0 ? 'completed' : 'failed';
    process_record.exitCode = exitCode;
    outputStream.close();
  });

  return process_record;
}
```

#### 模式 B：交互终端模式（调试/手动干预）

用于人类需要直接与 CLI 交互的场景（调试 prompt、手动修正等）。

```typescript
// 交互模式：前端嵌入完整终端
async function spawnInteractiveSession(cliType: 'claude' | 'gemini'): Promise<CLIProcess> {
  const command = cliType === 'claude' ? 'claude' : 'gemini';

  const pty = spawn(command, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: projectRoot,
    env: {
      ...process.env,
      ...(cliType === 'claude'
        ? { ANTHROPIC_API_KEY: getApiKey('claude') }
        : { GEMINI_API_KEY: getApiKey('gemini') }),
    },
  });

  // 双向桥接：WebSocket ↔ PTY
  // 前端 xterm.js 的输入 → PTY stdin
  // PTY stdout → WebSocket → 前端 xterm.js
  return createBidirectionalBridge(pty);
}
```

### 2.4 进程池与并发控制

编剧室需要并行运行多个 CLI 实例（如多个角色代言人并行审查）：

```typescript
interface ProcessPool {
  maxConcurrent: {
    claude: number;   // Claude 并发上限（受 API rate limit）
    gemini: number;   // Gemini 并发上限
  };

  queue: SpawnConfig[];   // 等待队列
  active: Map<string, CLIProcess>;  // 活跃进程

  // 提交任务，自动排队
  submit(config: SpawnConfig): Promise<CLIProcess>;

  // 等待所有指定任务完成
  waitAll(processIds: string[]): Promise<CLIProcess[]>;

  // 批量提交并行任务
  submitParallel(configs: SpawnConfig[]): Promise<CLIProcess[]>;
}
```

并发控制策略：

```yaml
# config/models.yaml
concurrency:
  claude:
    max_parallel: 3          # Claude 最多3个并行进程
    rate_limit_rpm: 50       # 每分钟请求上限
    cooldown_on_429: 30s     # 遇到 rate limit 时冷却时间
  gemini:
    max_parallel: 2
    rate_limit_rpm: 30
    cooldown_on_429: 30s
```

### 2.5 输出流路由

多个 CLI 进程的输出需要路由到正确的前端组件：

```
CLI 进程 1 (architect)   ──→  WebSocket channel: "process:abc123"  ──→  前端面板 1
CLI 进程 2 (writer-A)    ──→  WebSocket channel: "process:def456"  ──→  前端面板 2
CLI 进程 3 (writer-B)    ──→  WebSocket channel: "process:ghi789"  ──→  前端面板 3
CLI 进程 4 (critic)      ──→  WebSocket channel: "process:jkl012"  ──→  前端面板 4
```

前端可以选择查看单个进程的输出，或聚合视图查看所有进程。

### 2.6 认证与会话管理

```typescript
// CLI 认证状态管理
interface CLIAuthManager {
  // 检查 CLI 认证状态
  checkAuth(cliType: 'claude' | 'gemini'): Promise<AuthStatus>;

  // 设置 API Key（存入加密存储）
  setApiKey(cliType: string, key: string): Promise<void>;

  // 获取 API Key（运行时注入环境变量）
  getApiKey(cliType: string): string;

  // OAuth 流程（如果 CLI 支持）
  initiateOAuth(cliType: string): Promise<OAuthSession>;
}

interface AuthStatus {
  authenticated: boolean;
  method: 'api_key' | 'oauth' | 'none';
  expiresAt?: Date;        // OAuth token 过期时间
  quotaRemaining?: number; // 剩余配额
}
```

API Key 存储策略：
- 开发环境：加密存入 SQLite，使用 `CONSOLE_SECRET` 环境变量作为加密密钥
- 不明文存储在配置文件或版本控制中
- 运行时通过环境变量注入到 CLI 子进程

### 2.7 错误处理与恢复

```typescript
// 进程监控与自动恢复
interface ProcessMonitor {
  // 监控进程健康状态
  healthCheck(processId: string): HealthStatus;

  // 检测僵死进程（长时间无输出）
  detectStall(processId: string, timeoutMs: number): boolean;

  // 自动恢复策略
  recovery: {
    // 进程崩溃：记录错误，通知前端，根据配置决定是否重试
    onCrash(process: CLIProcess): Promise<void>;

    // 输出超时：可能是 API 延迟或死锁
    onStall(process: CLIProcess): Promise<void>;

    // Rate limit：自动排队等待
    onRateLimit(process: CLIProcess): Promise<void>;
  };
}
```

---

## 3. 前端页面设计

### 3.1 页面结构

```
┌─ 顶部导航栏 ──────────────────────────────────────────┐
│  NovelForge │ 项目名 │ 管线状态 │ Token 消耗 │ 设置   │
├─────────────┼─────────────────────────────────────────┤
│             │                                         │
│  侧边导航   │              主内容区                     │
│             │                                         │
│  📊 仪表盘  │                                         │
│  🎬 管线    │                                         │
│  ✍️ 编剧室  │                                         │
│  📚 资料库  │                                         │
│  📖 稿件    │                                         │
│  📋 检查点  │                                         │
│  ⚙️ 配置    │                                         │
│  💻 终端    │                                         │
│             │                                         │
└─────────────┴─────────────────────────────────────────┘
```

### 3.2 各页面功能

#### 仪表盘（Dashboard）

总览页，一眼掌握项目状态：

- **进度条**：当前卷/总卷、当前章/本卷总章、总字数/目标字数
- **管线状态**：当前阶段、上一次操作、下一步计划
- **活跃进程**：正在运行的 CLI 进程列表及状态
- **Token 消耗**：本次会话 / 本卷 / 全书累计，带趋势图
- **最近事件**：时间线展示最近的操作和事件
- **告警**：一致性 warning、伏笔到期提醒、异常状态

#### 管线控制（Pipeline）

制片人管线的可视化操作：

- **管线流程图**：可视化展示当前管线位置和历史流转
- **操作按钮**：启动 / 暂停 / 恢复 / 从指定章节重跑
- **决策日志**：制片人每轮的决策记录和理由
- **状态信号面板**：plot_deviation、pacing_score 等信号的实时展示
- **自动/手动切换**：可以切换为手动模式，每步需要人工确认

#### 编剧室（Writers' Room）

当前章节生成过程的实时视图：

- **角色面板**：每个参与的 Agent 一个卡片，显示状态（等待/运行/完成）
- **实时输出流**：点击某个角色可查看其 CLI 的实时输出
- **工作文件**：chapter-brief、structure-draft、各版草稿的在线查看和对比
- **竞稿对比**：高潮章节的两版初稿并排对比
- **流程进度**：当前处于编剧室流程的哪个阶段

#### 资料库（Lore）

资料文档的可视化管理：

- **世界观编辑器**：Markdown 编辑器，编辑 lore/world/ 下的文件
- **角色管理**：角色列表、关系图可视化、角色档案编辑
- **角色关系图**：基于 `_index.md` 的关系网络图
- **伏笔追踪**：伏笔列表，状态筛选（planted/resolved/overdue）
- **上下文层预览**：查看 L0/L1/L2 的当前内容和 token 占用
- **搜索**：全文搜索所有资料文档

#### 稿件管理（Manuscript）

已生成章节的管理：

- **章节列表**：按卷分组，显示章节号、标题、字数、生成时间
- **章节阅读器**：Markdown 渲染阅读，支持批注
- **章节元数据**：查看 meta.yaml（出场角色、伏笔操作等）
- **版本对比**：查看同一章节的不同草稿版本差异
- **批量导出**：导出为 TXT / EPUB / PDF

#### 检查点审阅（Checkpoints）

人类审阅界面：

- **检查点列表**：待审阅 / 已审阅
- **审阅面板**：展示检查点报告内容
- **决策操作**：通过 / 给出修改指令 / 回滚到指定章节
- **修改指令编辑器**：给制片人下达调整指令
- **审阅历史**：历史审阅记录和决策

#### 配置中心（Settings）

```
┌─ 配置中心 ─────────────────────────────────────────┐
│                                                     │
│  ┌─ 模型配置 ─────────────────────────────────────┐ │
│  │  Claude API Key:  [••••••••••••]  [测试连接]   │ │
│  │  Gemini API Key:  [••••••••••••]  [测试连接]   │ │
│  │  Claude 模型:     [claude-sonnet-4-6 ▼]        │ │
│  │  Gemini 模型:     [gemini-2.5-pro ▼]           │ │
│  │  并发上限:        Claude [3]  Gemini [2]       │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ 管线配置 ─────────────────────────────────────┐ │
│  │  检查点间隔:      每 [10] 章                    │ │
│  │  章节目标字数:    [4000] - [5000] 字            │ │
│  │  自动恢复:        [开启 ▼]                      │ │
│  │  重试次数:        [2]                           │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ 编剧室配置 ───────────────────────────────────┐ │
│  │  日常章配置:      [架构师 + 主笔]               │ │
│  │  剧情章配置:      [架构师 + 主笔 + 角色代言人]   │ │
│  │  高潮章配置:      [全编剧室 + 竞稿]             │ │
│  │  竞稿触发:        [仅高潮章 ▼]                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ 远程服务器 ───────────────────────────────────┐ │
│  │  服务器地址:      [user@host]                   │ │
│  │  SSH 密钥:        [已配置 ✓]                    │ │
│  │  Claude CLI 路径: [/usr/local/bin/claude]       │ │
│  │  Gemini CLI 路径: [/usr/local/bin/gemini]       │ │
│  │  项目目录:        [/home/user/novel-project]    │ │
│  │  [测试连接]                                     │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 终端（Terminal）

嵌入式终端，直接操作：

- **多标签终端**：可同时打开多个终端会话
- **快捷命令**：预设常用命令（启动管线、查看状态等）
- **CLI 交互会话**：直接与 Claude Code 或 Gemini CLI 对话
- **日志查看**：查看历史进程的完整输出日志

---

## 4. 远程服务器控制方案

### 4.1 部署模型

Web 控制台与 CLI 可能不在同一台机器上：

```
场景 A：同机部署（开发/个人使用）
┌──────────────────────────────┐
│  同一台服务器                  │
│  Next.js 前端 + API           │
│  CLI 进程管理服务              │
│  Claude CLI / Gemini CLI      │
│  项目文件                     │
└──────────────────────────────┘

场景 B：分离部署（远程服务器 CLI）
┌─────────────────┐         ┌──────────────────────┐
│  本地/云端        │  SSH    │  远程 GPU/计算服务器   │
│  Next.js 前端    │◄──────►│  CLI Agent 守护进程   │
│  API 层          │  tunnel │  Claude CLI           │
│                  │         │  Gemini CLI           │
│                  │         │  项目文件             │
└─────────────────┘         └──────────────────────┘
```

### 4.2 远程 CLI 控制：Agent 守护进程

在远程服务器上部署一个轻量级 Agent 守护进程，接受 Web 控制台的指令：

```typescript
// 远程 Agent 守护进程（运行在 CLI 所在的服务器上）
interface RemoteAgent {
  // 通过 WebSocket 与 Web 控制台保持长连接
  connection: WebSocket;

  // 接收并执行命令
  handlers: {
    // 启动 CLI 进程
    'spawn': (config: SpawnConfig) => Promise<ProcessInfo>;

    // 终止进程
    'kill': (processId: string) => Promise<void>;

    // 查询进程状态
    'status': (processId: string) => ProcessInfo;

    // 读取文件（资料文档等）
    'readFile': (path: string) => string;

    // 写入文件
    'writeFile': (path: string, content: string) => void;

    // 列出目录
    'listDir': (path: string) => FileInfo[];

    // 实时转发 CLI 输出流
    'streamOutput': (processId: string) => ReadableStream;
  };
}
```

连接方式选择：

| 方式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| SSH 隧道 + WebSocket | 安全、利用已有 SSH 配置 | 需要维护隧道 | 远程服务器 |
| 直连 WebSocket + TLS | 延迟低、实现简单 | 需要开放端口 | 内网/VPN |
| HTTP 轮询 | 最简单、防火墙友好 | 延迟高、不适合流式 | 备选方案 |

推荐默认使用 SSH 隧道方案：

```bash
# Web 控制台自动建立 SSH 隧道
ssh -N -L 9100:localhost:9100 user@remote-server &

# 远程 Agent 监听 localhost:9100
# Web 控制台连接 localhost:9100
```

### 4.3 文件同步策略

Web 控制台需要读取和展示远程服务器上的项目文件：

```
策略 A：按需读取（推荐）
  - 前端需要显示某个文件时，通过 Agent 实时读取
  - 优点：无同步开销、始终最新
  - 缺点：每次查看都有网络延迟

策略 B：变更事件推送
  - Agent 监听项目目录的文件变更（使用 chokidar/fswatch）
  - 变更时推送通知到前端，前端按需拉取
  - 用于实时更新仪表盘和资料库视图

实际采用：A + B 结合
  - 文件内容按需读取
  - 目录结构和元数据通过变更事件推送
  - 对频繁更新的文件（pipeline-state.yaml）使用定期轮询
```

---

## 5. 数据模型

### 5.1 SQLite 表结构

```sql
-- 项目配置
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT FALSE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLI 进程记录
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  cli_type TEXT NOT NULL,          -- 'claude' | 'gemini'
  role TEXT NOT NULL,              -- 'architect' | 'main-writer' | ...
  chapter_number INTEGER,
  status TEXT NOT NULL,            -- 'running' | 'completed' | 'failed' | 'killed'
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  exit_code INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  output_file TEXT,                -- 输出文件路径
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 章节记录
CREATE TABLE chapters (
  chapter_number INTEGER PRIMARY KEY,
  volume INTEGER NOT NULL,
  title TEXT,
  chapter_type TEXT NOT NULL,      -- 'daily' | 'plot_advance' | 'climax' | 'foreshadow_resolve'
  word_count INTEGER,
  status TEXT NOT NULL,            -- 'planned' | 'in_progress' | 'completed' | 'revision'
  writers_room_config TEXT,        -- JSON: 参与角色列表
  total_tokens INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- 检查点记录
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  volume INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  status TEXT NOT NULL,            -- 'pending' | 'approved' | 'revision_requested' | 'rollback'
  report_path TEXT NOT NULL,
  human_decision TEXT,             -- JSON: 人类的决策和指令
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME
);

-- Token 消耗日志
CREATE TABLE token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id TEXT REFERENCES processes(id),
  cli_type TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  chapter_number INTEGER,
  role TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 事件日志
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- 'pipeline' | 'writers_room' | 'lore_update' | 'checkpoint' | 'error'
  message TEXT NOT NULL,
  details TEXT,                    -- JSON: 详细信息
  chapter_number INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 实时状态（内存 + WebSocket）

不存入数据库，通过 WebSocket 实时推送：

- 各 CLI 进程的实时输出流
- 管线当前步骤
- 编剧室各角色的当前状态

---

## 6. API 设计

### 6.1 RESTful API

```
# 管线控制
POST   /api/pipeline/start          启动管线
POST   /api/pipeline/pause          暂停管线
POST   /api/pipeline/resume         恢复管线
POST   /api/pipeline/restart/:ch    从指定章节重启
GET    /api/pipeline/status         获取管线状态
GET    /api/pipeline/decisions      获取决策日志

# 编剧室
GET    /api/writers-room/current    获取当前编剧室状态
GET    /api/writers-room/processes  获取所有活跃进程
POST   /api/writers-room/rerun/:ch  重跑指定章节

# 资料管理
GET    /api/lore/:type              列出指定类型的资料文档
GET    /api/lore/:type/:id          读取指定资料文档
PUT    /api/lore/:type/:id          更新资料文档
POST   /api/lore/:type              新建资料文档
DELETE /api/lore/:type/:id          删除资料文档
GET    /api/lore/context/:level     读取上下文层内容
GET    /api/lore/search?q=keyword   全文搜索

# 稿件管理
GET    /api/manuscript/volumes      列出所有卷
GET    /api/manuscript/:vol         列出指定卷的章节
GET    /api/manuscript/:vol/:ch     读取指定章节
GET    /api/manuscript/:vol/:ch/meta  读取章节元数据
GET    /api/manuscript/:vol/:ch/drafts  读取章节的历史草稿
POST   /api/manuscript/export       导出稿件

# 检查点
GET    /api/checkpoints             列出所有检查点
GET    /api/checkpoints/:id         读取检查点报告
POST   /api/checkpoints/:id/approve 通过检查点
POST   /api/checkpoints/:id/revise  下达修改指令
POST   /api/checkpoints/:id/rollback 回滚

# 配置
GET    /api/config                  获取所有配置
PUT    /api/config                  更新配置
POST   /api/config/test-connection  测试 CLI 连接
POST   /api/config/test-api-key     测试 API Key

# Token 统计
GET    /api/tokens/summary          Token 消耗总览
GET    /api/tokens/by-chapter       按章节统计
GET    /api/tokens/by-role          按角色统计
GET    /api/tokens/trend            消耗趋势
```

### 6.2 WebSocket 事件

```typescript
// 客户端 → 服务端
interface ClientEvents {
  // 订阅进程输出
  'subscribe:process': { processId: string };
  'unsubscribe:process': { processId: string };

  // 交互式终端输入
  'terminal:input': { sessionId: string; data: string };

  // 订阅管线状态变更
  'subscribe:pipeline': {};
}

// 服务端 → 客户端
interface ServerEvents {
  // 进程输出流
  'process:output': { processId: string; data: string };
  'process:status': { processId: string; status: string; exitCode?: number };

  // 管线状态变更
  'pipeline:status': { state: PipelineState };
  'pipeline:decision': { decision: Decision };

  // 编剧室状态
  'writers-room:update': { roles: RoleStatus[] };

  // 文件变更通知
  'file:changed': { path: string; type: 'created' | 'modified' | 'deleted' };

  // 检查点通知
  'checkpoint:created': { checkpointId: string };

  // 告警
  'alert': { level: 'info' | 'warning' | 'error'; message: string };
}
```

---

## 7. 安全设计

### 7.1 认证

- Web 控制台使用简单的密码保护（单用户场景）
- 密码哈希存储在 SQLite 中
- 使用 JWT token 管理会话
- API Key 使用 AES-256 加密存储

### 7.2 网络安全

- 所有通信走 HTTPS / WSS
- 远程服务器连接通过 SSH 隧道
- 不在前端暴露 API Key

### 7.3 文件系统安全

- API 层对文件路径做白名单校验，只允许访问项目目录内的文件
- 防止路径遍历攻击（`../` 等）

---

## 8. 项目结构

```
web-console/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # 根布局（侧边导航 + 顶栏）
│   │   ├── page.tsx                 # 仪表盘
│   │   ├── pipeline/
│   │   │   └── page.tsx             # 管线控制
│   │   ├── writers-room/
│   │   │   └── page.tsx             # 编剧室
│   │   ├── lore/
│   │   │   ├── page.tsx             # 资料库总览
│   │   │   ├── world/page.tsx       # 世界观
│   │   │   ├── characters/page.tsx  # 角色管理
│   │   │   └── threads/page.tsx     # 故事线/伏笔
│   │   ├── manuscript/
│   │   │   └── page.tsx             # 稿件管理
│   │   ├── checkpoints/
│   │   │   └── page.tsx             # 检查点审阅
│   │   ├── settings/
│   │   │   └── page.tsx             # 配置中心
│   │   ├── terminal/
│   │   │   └── page.tsx             # 终端
│   │   └── api/                     # API Routes
│   │       ├── pipeline/
│   │       ├── writers-room/
│   │       ├── lore/
│   │       ├── manuscript/
│   │       ├── checkpoints/
│   │       ├── config/
│   │       ├── tokens/
│   │       └── ws/                  # WebSocket 升级端点
│   │
│   ├── components/                  # 共享组件
│   │   ├── ui/                      # shadcn/ui 组件
│   │   ├── dashboard/               # 仪表盘组件
│   │   ├── pipeline/                # 管线可视化组件
│   │   ├── writers-room/            # 编剧室组件
│   │   ├── lore/                    # 资料编辑组件
│   │   ├── manuscript/              # 稿件阅读组件
│   │   └── terminal/                # 终端组件（xterm.js 封装）
│   │
│   ├── lib/                         # 核心库
│   │   ├── cli/                     # CLI 进程管理
│   │   │   ├── process-manager.ts   # CLIProcessManager 实现
│   │   │   ├── process-pool.ts      # 进程池与并发控制
│   │   │   ├── pty-bridge.ts        # PTY 桥接
│   │   │   └── auth-manager.ts      # CLI 认证管理
│   │   ├── remote/                  # 远程服务器通信
│   │   │   ├── agent-client.ts      # 远程 Agent 客户端
│   │   │   ├── ssh-tunnel.ts        # SSH 隧道管理
│   │   │   └── file-sync.ts         # 文件同步
│   │   ├── db/                      # 数据库
│   │   │   ├── schema.ts            # 表结构定义
│   │   │   ├── queries.ts           # 查询封装
│   │   │   └── migrations/          # 数据库迁移
│   │   ├── ws/                      # WebSocket
│   │   │   ├── server.ts            # WebSocket 服务端
│   │   │   └── events.ts            # 事件类型定义
│   │   └── utils/                   # 工具函数
│   │       ├── crypto.ts            # 加密工具
│   │       ├── file-parser.ts       # Markdown/YAML 解析
│   │       └── token-counter.ts     # Token 计数
│   │
│   ├── hooks/                       # React Hooks
│   │   ├── use-websocket.ts         # WebSocket 连接
│   │   ├── use-pipeline.ts          # 管线状态
│   │   ├── use-process.ts           # 进程状态
│   │   └── use-terminal.ts          # 终端会话
│   │
│   └── stores/                      # Zustand Stores
│       ├── pipeline-store.ts        # 管线状态
│       ├── process-store.ts         # 进程状态
│       └── config-store.ts          # 配置状态
│
├── remote-agent/                    # 远程 Agent 守护进程（独立部署包）
│   ├── package.json
│   ├── index.ts                     # 入口
│   ├── process-executor.ts          # CLI 进程执行
│   ├── file-watcher.ts              # 文件监控
│   └── ws-server.ts                 # WebSocket 服务
│
└── scripts/
    ├── setup.sh                     # 开发环境初始化
    ├── deploy-agent.sh              # 部署远程 Agent
    └── dev.sh                       # 开发启动脚本
```

---

## 9. 移动端迁移策略

### 9.1 架构准备

当前架构已为移动端迁移做好准备：

- **API 层完全独立**：所有业务逻辑通过 REST API + WebSocket 暴露，前端只是消费者
- **无服务端渲染依赖**：核心功能不依赖 Next.js SSR，纯 API 驱动
- **WebSocket 通用**：移动端可直接复用相同的 WebSocket 协议

### 9.2 迁移路径

```
阶段 1（当前）：Next.js Web 应用
阶段 2（需要时）：React Native / Expo 移动应用
  - 复用全部 API 和 WebSocket 协议
  - 复用 Zustand stores 和 hooks 逻辑
  - 仅重写 UI 组件层（React Native 组件）
  - 终端功能在移动端简化为日志查看器
```

---

## 10. 开发计划建议

### Phase 1：核心骨架

- 项目初始化（Next.js + shadcn/ui）
- SQLite 数据层
- CLI 进程管理服务（核心：spawn、kill、状态查询）
- WebSocket 基础设施
- 终端页面（xterm.js 集成，验证 CLI 控制方案）

### Phase 2：管线集成

- 管线控制 API（启动/暂停/恢复）
- 仪表盘页面
- 管线控制页面
- 编剧室实时视图

### Phase 3：内容管理

- 资料库 CRUD 和编辑器
- 稿件管理和阅读器
- 检查点审阅界面

### Phase 4：远程与增强

- 远程 Agent 守护进程
- SSH 隧道集成
- Token 统计和趋势分析
- 配置中心完善

### Phase 5：打磨与移动端

- UI/UX 优化
- 错误处理完善
- 移动端适配（如需）
