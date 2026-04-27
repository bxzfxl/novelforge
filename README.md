# NovelForge

AI 驱动的小说工程化写作系统。**Electron 桌面应用**，采用「编剧室 + 制片人」模式，多 Agent 协作全自动生成网文长篇小说。

## 架构

```
┌──────────────────────────────────────────┐
│              Electron 桌面壳               │
│  ┌────────────┐  ┌────────────────────┐  │
│  │ Main Process│  │  Renderer Process  │  │
│  │  AI / DB   │◄─┤  React 19 + Vite   │  │
│  │  Engine    │  │  Tailwind + shadcn  │  │
│  └─────┬──────┘  └────────────────────┘  │
│        │ contextBridge (Preload)          │
│        ▼                                  │
│  5 AI Provider (API Key)                  │
│  Anthropic / Google / OpenAI / Custom     │
└──────────────────────────────────────────┘
```

- **Main Process** — TypeScript，管理 SQLite、文件 I/O、AI 调用、IPC
- **Renderer Process** — React 19 + Vite CSR，四面板写作工作台
- **Preload** — `contextBridge` 暴露 `window.novelforge` API
- **无 CLI 依赖** — 直接调 SDK，用户自带 API Key

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- 至少一个 AI 服务商的 API Key

### 本地开发

```bash
# 1. 克隆并安装依赖
git clone https://github.com/bxzfxl/novelforge.git
cd novelforge
pnpm install

# 2. 启动开发（Vite HMR + Electron）
cd apps/desktop
pnpm dev

# 3. 测试
cd ../..
npx vitest run --config apps/desktop/vitest.config.ts
```

### 构建打包

```bash
cd apps/desktop
pnpm build:desktop    # 编译 + electron-builder 打包
```

## 目录结构

```
novelforge/
├── apps/desktop/           # Electron 桌面应用
│   ├── src/
│   │   ├── main/           # 主进程（AI/DB/Engine/IPC）
│   │   ├── preload/        # contextBridge
│   │   └── renderer/       # React UI
│   ├── scripts/            # 开发脚本
│   ├── tests/              # 单元测试 + E2E
│   └── resources/          # 应用图标
├── packages/
│   ├── shared/             # @novelforge/shared 类型包
│   └── prompts/            # @novelforge/prompts 模板库
├── _legacy/                # 旧 Web 架构（已废弃）
├── docs/                   # 设计文档
└── pnpm-workspace.yaml
```

## 技术栈

- **壳**: Electron 34
- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **状态管理**: Zustand 5.x
- **数据库**: SQLite (better-sqlite3, WAL)
- **AI SDK**: @anthropic-ai/sdk / @google/generative-ai / openai
- **加密**: AES-256-GCM API Key 本地加密
- **测试**: Vitest + Playwright
- **包管理**: pnpm monorepo

## 开发规范

- TypeScript strict mode
- 组件使用 shadcn/ui + Radix primitives
- Commit 格式：`<type>(scope): <summary>`
- 代码注释使用简体中文
