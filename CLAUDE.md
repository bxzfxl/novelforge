# NovelForge — AI 小说工程化写作系统

## 项目概述

NovelForge 是一个 **Electron 桌面应用**，采用"编剧室 + 制片人"模式（Writers' Room + Showrunner），通过多 Agent 协作全自动生成百万字级网文长篇小说。用户自带 API Key，直接在本地调用 AI 服务。

## 架构

- **Electron 34** 桌面壳（Main Process + Preload + Renderer Process）
- **Renderer**：React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Main Process**：TypeScript 编译为 CJS，管理数据库、文件 I/O、AI 调用、IPC 路由
- **Preload**：`contextBridge.exposeInMainWorld` 暴露类型安全的 `window.novelforge` API
- **AI 层**：5 个 Provider（Anthropic SDK / Google GenAI SDK / OpenAI SDK / OpenAI Compatible / Custom HTTP）+ AES-256-GCM 本地加密
- **引擎层**：Pipeline 状态机 + Writers' Room 调度器（Architect→Writer→Critic+Continuity→Revise）+ 四级上下文金字塔
- **数据库**：SQLite (better-sqlite3)，WAL 模式
- **文件存储**：Markdown + YAML frontmatter 章节文件
- **包管理**：pnpm monorepo（`apps/desktop` + `packages/shared` + `packages/prompts`）

## 目录结构

```
novelforge/
├── apps/desktop/           # Electron 桌面应用
│   ├── src/
│   │   ├── main/           # 主进程
│   │   │   ├── index.ts        # 应用入口
│   │   │   ├── window-manager.ts
│   │   │   ├── ai/             # AI Provider 层
│   │   │   │   ├── client.ts
│   │   │   │   ├── crypto.ts
│   │   │   │   ├── cost-tracker.ts
│   │   │   │   ├── model-manager.ts
│   │   │   │   └── providers/  # Anthropic/Google/OpenAI/OpenAI-Compatible
│   │   │   ├── db/             # 数据库层
│   │   │   │   ├── connection.ts
│   │   │   │   ├── migrations/ # SQL 迁移（内联到源码）
│   │   │   │   └── queries/    # CRUD 操作
│   │   │   ├── engine/         # 小说引擎
│   │   │   │   ├── pipeline.ts     # 管线状态机
│   │   │   │   ├── writers-room.ts # 编剧室调度器
│   │   │   │   └── lore-engine.ts  # 资料引擎
│   │   │   ├── ipc/            # IPC 处理器
│   │   │   │   ├── context.ts      # 共享上下文
│   │   │   │   ├── project.ipc.ts
│   │   │   │   ├── chapter.ipc.ts
│   │   │   │   ├── lore.ipc.ts
│   │   │   │   ├── pipeline.ipc.ts
│   │   │   │   ├── ai.ipc.ts
│   │   │   │   └── native.ipc.ts
│   │   │   └── store/          # FileStore（Markdown I/O）
│   │   ├── preload/        # contextBridge 预加载
│   │   │   └── index.ts
│   │   └── renderer/       # 渲染进程（React UI）
│   │       ├── index.html
│   │       ├── main.tsx
│   │       ├── App.tsx         # 页面路由
│   │       ├── lib/
│   │       ├── stores/         # Zustand stores
│   │       ├── layouts/        # 四面板 Studio 布局
│   │       ├── panels/         # Navigator/Editor/Inspector/CommandBar
│   │       ├── settings/       # 设置页（模型/角色绑定/通用）
│   │       ├── onboarding/     # 项目初始化向导
│   │       ├── pipeline/       # 管线监控 + 检查点审阅
│   │       ├── export/         # 导出对话框
│   │       ├── components/     # 通用组件（StatusBar/ui）
│   │       ├── hooks/          # useShortcuts 等
│   │       └── styles/         # globals.css + 动画
│   ├── scripts/            # 开发脚本
│   │   ├── dev-main.ts         # Electron 开发启动
│   │   └── dev-bootstrap.js    # tsx 引导加载器
│   ├── tests/              # 测试
│   │   ├── unit/
│   │   │   ├── ai/providers.test.ts
│   │   │   ├── engine/pipeline.test.ts
│   │   │   ├── prompts/architect.test.ts
│   │   │   └── store/file-store.test.ts
│   │   └── e2e/
│   │       └── full-flow.spec.ts
│   ├── resources/          # 应用图标
│   ├── electron-builder.yml
│   └── package.json
├── packages/
│   ├── shared/             # @novelforge/shared — 类型定义
│   │   └── src/
│   │       ├── types/
│   │       │   ├── project.ts
│   │       │   ├── chapter.ts
│   │       │   ├── lore.ts
│   │       │   ├── ai.ts
│   │       │   ├── pipeline.ts
│   │       │   └── settings.ts
│   │       └── constants.ts
│   └── prompts/            # @novelforge/prompts — Prompt 模板库
│       └── src/
│           ├── roles/      # 编剧室角色模板（11 个）
│           ├── pipeline/   # 管线模板（3 个）
│           ├── lore/       # 资料维护模板（4 个）
│           └── system-prompts.ts
├── _legacy/                # 旧 Web 架构代码（已废弃，参考用）
├── docs/                   # 设计文档与实施计划
│   ├── STATUS.md
│   ├── ROADMAP.md
│   └── superpowers/
│       ├── specs/          # 设计规范
│       └── plans/          # 实施计划
└── pnpm-workspace.yaml
```

## 关键设计文档

- `docs/DESIGN.md` — Notion 暖白设计系统规范（色彩/字体/组件/间距/阴影/圆角）
- `docs/superpowers/specs/2026-04-27-novelforge-desktop-rewrite-design.md` — 桌面应用架构设计规范
- `docs/superpowers/plans/2026-04-27-novelforge-desktop-rewrite.md` — 实施计划（7 Group，37 提交）
- `docs/STATUS.md` — 当前实现状态
- `docs/ROADMAP.md` — 路线图

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发（Vite HMR + Electron 主进程）
cd apps/desktop && pnpm dev

# 类型检查
pnpm typecheck              # Renderer
pnpm -C apps/desktop typecheck   # 全部
npx tsc --noEmit -p apps/desktop/tsconfig.main.json  # Main Process

# 测试
npx vitest run --config apps/desktop/vitest.config.ts

# 构建
pnpm -C apps/desktop build              # Vite + tsc 编译
pnpm -C apps/desktop build:desktop      # 构建 + electron-builder 打包
```

## 测试覆盖

| 模块 | 测试数 | 文件 |
|------|--------|------|
| PipelineEngine | 12 | `tests/unit/engine/pipeline.test.ts` |
| FileStore | 13 | `tests/unit/store/file-store.test.ts` |
| Provider 工厂 | 6 | `tests/unit/ai/providers.test.ts` |
| Prompt 模板 | 6 | `tests/unit/prompts/architect.test.ts` |
| E2E | 骨架 | `tests/e2e/full-flow.spec.ts` |
| **合计** | **37** | |

## 开发规范

- pnpm monorepo
- TypeScript strict mode
- UI 组件使用 shadcn/ui + Radix primitives
- **设计系统**：遵循 `docs/DESIGN.md` Notion 暖白规范，所有色值通过 `globals.css` CSS 变量引用（`--color-nf-*`、`--shadow-*`），禁止硬编码十六进制色值
- 状态管理使用 Zustand 5.x
- IPC 使用 contextBridge + ipcRenderer.invoke
- API Key 加密使用 AES-256-GCM（本地密钥）
- 代码注释使用简体中文
- Commit 格式：`<type>(scope): <summary>`
- 函数 ≤ 50 行、文件 ≤ 300 行
