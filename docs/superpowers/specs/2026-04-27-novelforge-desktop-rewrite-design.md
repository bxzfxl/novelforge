# NovelForge Desktop — 完全重写设计文档

> 从 Web 应用 + CLI 依赖 重写为 Electron 桌面应用 + API 直调 + 写作工作室 UX

## 1. 动机与目标

### 当前问题

- **外部依赖重**：用户必须安装和认证 Claude CLI / Gemini CLI
- **Web 架构臃肿**：Next.js SSR、Socket.IO 跨进程通信、Docker 部署不适合桌面场景
- **UX 不对口**：Web 控制台定位是"运维面板"，不是写作工具
- **不可商业化**：CLI 依赖导致用户门槛高，架构无法支撑规模化分发

### 目标

- **零 CLI 依赖** — 用户只需 API Key，不安装任何 CLI 工具
- **纯桌面应用** — Electron 原生构建，dmg/exe/AppImage 分发
- **写作工作室 UX** — Scrivener/Ulysses 风格的专业写作体验
- **商业级品质** — 面向付费用户的精致软件

### 三阶段商业模式

```
Phase 1: 免费获客         Phase 2: 服务变现          Phase 3: 规模化盈利
 全功能免费 + 自备 Key →  API 中转服务赚差价 →  订阅制 + 捆绑套餐
```

## 2. 架构总览

### 技术栈

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 桌面框架 | Electron | Chrome DevTools 调试、成熟生态、VS Code/Slack 验证 |
| 前端框架 | React 19 + TypeScript | 生态最大、团队技能匹配 |
| UI 组件 | shadcn/ui + Radix + 大量自定义 | 基础控件标准化，写作面板全部自研 |
| 构建 (渲染) | Vite | 比 Next.js 轻量，CSR 足够 |
| 构建 (主进程) | tsx | Node.js TypeScript 直接运行 |
| 状态管理 | Zustand + 持久化 | 轻量、适合中型桌面应用 |
| AI 调用 | Anthropic SDK + Google AI SDK + OpenAI SDK | 零 CLI 依赖 |
| 数据库 | better-sqlite3 (WAL 模式) | 同步 API、成熟稳定 |
| 文件格式 | Markdown + YAML frontmatter | 人类可读、Git 友好、可导出 |
| 打包 | electron-builder | macOS DMG / Windows NSIS / Linux AppImage |
| 测试 | Vitest + Playwright (E2E) | 商业软件测试体系 |

### 进程架构

```
┌─ Electron App ─────────────────────────────────────────────┐
│  ┌─ Main Process (Node.js) ────────────────────────────┐  │
│  │  WindowManager / ProjectManager                     │  │
│  │  PipelineEngine / WritersRoom / LoreEngine          │  │
│  │  AIClient / FileStore / Database                    │  │
│  │  UpdateManager (Phase 3 启用)                       │  │
│  │  ┌─ Preload (contextBridge) ────────────────────┐  │  │
│  │  │  类型安全 IPC API，隔离渲染进程 Node.js 能力   │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └───────────────┬─────────────────────────────────────┘  │
│                  │ IPC                                     │
│  ┌───────────────┴─────────────────────────────────────┐  │
│  │  Renderer Process (Chromium)                        │  │
│  │  React SPA (Vite HMR)                               │  │
│  │  写作工作室 / 向导 / 资料管理 / 管线监控 / 设置      │  │
│  │  Chrome DevTools (开发模式自动打开)                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 与旧架构的本质区别

| 旧架构 | 新架构 |
|--------|--------|
| Web 应用 (Next.js SSR) | Electron SPA (Vite CSR) |
| Socket.IO WebSocket 跨进程 | Electron IPC (contextBridge) |
| Remote Agent 独立进程管理 CLI | AI SDK 直调，内联 Main Process |
| Shell 脚本编排管线 | TypeScript 状态机编排 |
| Docker 部署 | 原生安装包 |
| 无授权 | Phase 1 免费，Phase 3 加授权 |

### 保留的核心资产

- **Prompt 模板库** (15+ 模板) — 移植为 TypeScript 模板函数
- **编剧室协作流程** — 架构师→主笔→审查→修订
- **四级上下文金字塔** (L0-L2) — 设计保留，实现重写
- **管线状态机** — 概念保留，TypeScript 重写
- **数据模型** — Markdown + SQLite 混合存储模型保留

## 3. 项目结构

```
novelforge-desktop/
├── package.json                  # monorepo root
├── pnpm-workspace.yaml           # apps/* + packages/*
│
├── apps/
│   └── desktop/                  # Electron 主项目
│       ├── package.json
│       ├── electron-builder.yml
│       ├── src/
│       │   ├── main/             # Main Process
│       │   │   ├── index.ts
│       │   │   ├── window-manager.ts
│       │   │   ├── ipc/          # IPC 处理器
│       │   │   ├── engine/       # 管线/编剧室/资料引擎
│       │   │   ├── ai/           # AIClient + Providers
│       │   │   ├── db/           # SQLite
│       │   │   └── store/        # 文件系统管理
│       │   ├── preload/          # contextBridge
│       │   └── renderer/         # React SPA
│       │       ├── layouts/      # 四面板布局
│       │       ├── pages/        # 页面组件
│       │       ├── panels/       # 导航/编辑/辅助面板
│       │       ├── components/   # UI + 业务组件
│       │       ├── stores/       # Zustand
│       │       └── lib/          # IPC 客户端封装
│       └── resources/            # 图标
│
├── packages/
│   ├── shared/                   # 共享类型与常量
│   └── prompts/                  # Prompt 模板库 (TypeScript)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                      # Playwright + Electron
│
└── docs/design/
```

### Git 仓库策略

- 仓库设为**私有**
- 新 Electron 项目作为 git 主体（根目录一等公民）
- 旧代码移入 `_legacy/` 目录，只读参考，不参与构建/测试

```
novelforge/                        # ← 私有仓库
├── apps/                         # ★ 新项目主体
├── packages/
├── tests/
├── docs/
├── _legacy/                      # 旧代码归档，只读
│   ├── web-console/
│   ├── remote-agent/
│   ├── scripts/
│   └── prompts/
├── package.json                  # monorepo root → 新项目
└── pnpm-workspace.yaml           # 仅含 apps/* + packages/*
```

### 开发命令

```bash
pnpm dev               # Electron 开发模式 (Vite HMR + DevTools)
pnpm dev:debug         # 额外开启 Main Process --inspect
pnpm test              # Vitest 单元测试
pnpm test:e2e          # Playwright E2E
pnpm build             # 构建所有包
pnpm build:desktop     # 打包当前平台安装包
pnpm lint              # ESLint + Prettier
pnpm typecheck         # TypeScript 全量类型检查
```

## 4. 核心引擎

### 4.1 管线状态机

```
idle → planning → writing → lore_updating → checkpoint → planning (循环)
                      ↓                         ↓
                   paused (可恢复)           approved → 下一章
                   error (需人工)             rejected → 返回 writing
```

TypeScript 实现，每个状态转换有类型约束，UI 可实时展示当前阶段和进度。

### 4.2 Writers' Room 调度

```
1. Architect   → structure-draft.md (场景划分、节奏曲线)
2. Main Writer → draft-v1.md (正文初稿) [可并行: 角色代言人/氛围渲染]
3. Critic + Continuity → review-notes.md [并行审查]
4. Revise → draft-final.md (合并意见修订)
5. Lore Engine → 摘要/角色更新/伏笔/上下文刷新
```

每个角色是纯函数调用 — 接收 context、返回 text，通过 AIClient 统一执行。调度器控制顺序、并行度和容错重试。章节类型决定参与角色：日常章 15K tokens，关键章 50K tokens。

### 4.3 Prompt 模板系统

15+ 模板从 Markdown 移植为 TypeScript 函数，类型安全：

```typescript
export function architectPrompt(context: ChapterContext): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.architect,
    messages: [{ role: 'user', content: render('architect-user', context) }],
    config: { model: 'claude-sonnet-4-6', maxTokens: 16000, temperature: 0.7 }
  }
}
```

### 4.4 Lore Engine (资料引擎)

四级上下文金字塔：

- **L0** — 全局摘要 (始终加载) ~500 字
- **L1** — 分卷上下文 (进入该卷时加载) ~2000 字
- **L2** — 滚动窗口 (最近 5 章摘要) ~1000 字
- **L3** — 按需检索 (角色档案/势力/伏笔)

每章完成后自动运行：生成摘要 → 更新角色状态 → 刷新上下文层。

## 5. AI 集成层

### 5.1 统一 Provider 抽象

```typescript
interface AIChatProvider {
  chat(messages, opts): Promise<ChatResult>
  chatStream(messages, opts): AsyncIterable<Chunk>
  models(): Promise<ModelInfo[]>
  validate(): Promise<boolean>
}
```

所有 Provider 实现同一接口，AIClient 不关心具体厂商。

### 5.2 内置 Provider

| Provider | SDK | 说明 |
|----------|-----|------|
| Anthropic | @anthropic-ai/sdk | Opus/Sonnet/Haiku，prompt caching |
| Google Gemini | @google/generative-ai | 长上下文 1M+ |
| OpenAI | openai SDK | GPT-4o / o3-mini |
| OpenAI-Compatible | openai SDK (改 baseURL) | DeepSeek/通义/智谱/月之暗面/Ollama 等一切兼容协议 |
| Custom HTTP | fetch | 自定义端点 |

**关键设计：OpenAI-Compatible 一个适配器覆盖几十家模型。**

### 5.3 模型配置

```typescript
interface ModelConfig {
  id: string
  provider: 'anthropic' | 'google' | 'openai' | 'openai-compatible' | 'custom'
  apiKey: string           // 加密存储
  baseURL?: string
  modelId: string
  maxTokens?: number
  maxConcurrency?: number
  tags?: string[]
  enabled: boolean
}
```

### 5.4 模型路由

角色 → 模型由用户自由绑定，不硬编码。出厂不绑定，首次启动引导配置。系统根据已启用模型自动建议角色分配。

### 5.5 Prompt Caching

Anthropic prompt caching：L0-L1 上下文层标记为 cacheable（变化频率低），cache_read 便宜 90%。

### 5.6 错误处理与成本追踪

- 可重试错误 (rate_limit/timeout/server_error)：指数退避自动重试
- 不可重试错误 (auth/content_filter)：暂停管线通知用户
- 成本追踪：每笔调用记录 token 用量和费用，实时展示管线消耗和项目累计

## 6. 数据层

### 6.1 SQLite 表结构

`projects` / `volumes` / `chapters` / `lore_entries` / `context_layers` / `pipeline_runs` / `ai_call_logs` / `checkpoints` / `settings`

### 6.2 文件系统

```
~/NovelForge/
├── config.json
├── projects/{name}/
│   ├── project.db
│   ├── lore/{world,characters,style}/
│   ├── outline/{master,vol-n,threads}/
│   ├── manuscript/vol-{n}/ch-{nnn}.md
│   └── workspace/current/
```

### 6.3 Markdown Frontmatter

每章自带 YAML 元数据（字数、状态、角色、伏笔、AI 模型、成本），不依赖数据库即可理解内容。

### 6.4 IPC 数据流

渲染进程不直接访问文件系统和数据库，所有操作通过 `contextBridge` 暴露的类型安全 API：

```typescript
interface NovelForgeAPI {
  project: { list, create, open, delete }
  chapter: { get, list, save }
  lore: { get, list, save }
  pipeline: { start, pause, stop, getState, onEvent }
  ai: { assist, streamAssist }
  native: { showOpenDialog, showSaveDialog, exportProject }
}
```

## 7. 写作工作室 UX

### 7.1 四面板布局

- **左侧 240px**：导航面板（大纲/角色/世界观/成稿树形导航）
- **中央 flex**：Markdown 编辑器（分屏预览/打字机滚动/聚焦模式）
- **右侧 280px**：辅助面板（上下文感知：章节信息/AI 输出流/角色卡片）
- **底部状态栏**：字数/章节/管线进度

### 7.2 三种视图模式

- **写作模式** — 编辑器最大化，侧边栏可折叠，专注写作
- **指挥模式** — 管线步骤可视化 + AI 输出流 + 角色状态卡片
- **审阅模式** — 并排对比 + 批准/驳回操作

### 7.3 AI 指令面板 (Ctrl+J)

写作中随时唤出，不离开编辑器：续写/润色/扩写/精简/生成对话/改写风格/一致性检查。选中文本后操作。

### 7.4 动画与质感

面板切换 200ms ease-out、AI 输出打字机效果、骨架屏加载态、空状态专属引导、右键原生 ContextMenu、面板分隔线可拖拽。

## 8. 项目初始化向导

### 8.1 快速初始化 (5 步 · 5 分钟)

1. 基本信息（书名/笔名/类型/字数/风格）
2. AI 模型（至少配一个，可跳过）
3. 主角设定（AI 生成 + 手动调整）
4. 世界观预览（AI 生成 + 微调）
5. 确认并进入

### 8.2 高级初始化 (7 类 · 15-30 分钟)

1. 基本信息 — 含别名/子类型/简介
2. AI 模型 — 主模型组/辅助模型组/备选降级/高级角色路由
3. 主角人设 — 性格层/背景故事/金手指/成长弧线
4. 配角设定 — 多角色管理，AI 生成角色画像
5. 世界观 — 境界体系/势力分布/地理版图/核心规则/用语词典
6. 大纲规划 — 总纲/分卷规划/支线追踪
7. 风格规范 — 叙事视角/对话规范/写作节奏/禁忌列表

### 8.3 设计要点

- AI 辅助覆盖所有输入框（一键生成，不满意重新生成）
- 处处可跳过（不阻塞流程）
- 自动存草稿（切换分类自动保存，关窗口不丢数据）
- 分类间互相关联（主角设定自动同步角色/世界观词条）
- 完成度指示（✓/▶/— 标记每类状态）
- 随时可切快速模式

## 9. 管线监控与检查点审阅

### 9.1 管线监控面板

- 总进度条 + 预估剩余时间 + 已用成本
- 当前章节步骤列表（Showrunner → Architect → Writer → Critic → Continuity → Revise → Lore）
- 每步状态（✓ 完成 / ⏳ 进行中 / ○ 等待 / ✗ 失败）
- AI 实时输出流（打字机效果，显示当前字数/目标字数）
- 暂停/停止/手动介入按钮

### 9.2 检查点审阅

- 本卷/本章概要 + AI 自评清单
- 逐项审核（主线/伏笔/角色一致性/战力体系/感情线/收束）
- 每项可认可或驳回，驳回时填写修改建议
- 选择驳回范围（单章/全卷/仅修正特定问题）

## 10. 导出与分享

- 格式：EPUB / TXT / DOCX / PDF / .novelforge 项目包
- EPUB 选项：自定义封面、排版风格、目录、元数据
- 分享水印：可选无水印或 NovelForge 创作工具水印
- 纯文件转换，不依赖 AI

## 11. 配置页面 — 模型管理

极简高效：模型卡片列表 + Add Model 一键添加。

Add Model 一页搞定：Provider Type → Display Name → API Key → Base URL → Model ID → 可选高级设置 → Test Connection → Save。

特性：
- OpenAI-Compatible 一个适配器覆盖几十家模型
- Test Connection 3 秒验证 API Key + URL + Model ID
- 支持 OpenAPI /v1/models 端点的服务可一键拉取模型列表
- 角色→模型分配：下拉选择，设置默认 Fallback

## 12. 键盘快捷键

- **Ctrl+S** 保存 | **Ctrl+J** AI 指令 | **Ctrl+Shift+F** 专注模式
- **Ctrl+N/O** 新建/打开项目 | **Ctrl+,** 设置 | **Ctrl+1/2/3** 切换视图
- **Ctrl+W** 关闭项目 | **Ctrl+Shift+E** 导出 | **F11** 全屏
- 所有快捷键可在设置中自定义

## 13. 商业模式

### Phase 1 — 全功能免费
- 全部功能免费，用户自备 API Key
- 无授权校验、无 License Manager
- 聚焦增长和留存，口碑传播

### Phase 2 — API 中转服务
- 可选增值服务，不干扰自备 Key 用户
- 套餐制（月付，含 N 万字额度）
- 利润来源：批量 API 采购折扣 + 智能路由降低成本

### Phase 3 — 订阅制 + 捆绑
- Free 层保留（基础功能 + 自备 Key）
- Pro 层（无限 AI 中转 + 竞稿模式 + 高级导出）
- Enterprise（团队协作 + 私有化部署 + 专属模型微调）

## 14. 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 单元 | Vitest | Prompt 模板、状态机转换、Markdown 解析、成本计算 |
| 集成 | Vitest + mock SDK | AIClient 路由、Lore Engine 组装、Pipeline 编排 |
| E2E | Playwright + Electron | 新建项目→配模型→启动管线→生成→审阅→导出 全流程 |

## 15. 不需要实现的内容 (Phase 1)

- LicenseManager / 付费墙 / 功能开关
- API Relay 中转服务后端
- 订阅管理 / 支付集成
- 离线激活 / 反破解
- 用户账户系统
- 分析/遥测（默认关闭，如需添加需用户明确同意）
- auto-updater（Phase 1 可手动下载更新）
