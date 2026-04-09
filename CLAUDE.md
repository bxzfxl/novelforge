# NovelForge - AI 小说工程化写作系统

## 项目概述

NovelForge 是一个 AI 驱动的小说工程化写作系统，采用"编剧室 + 制片人"模式（Writers' Room + Showrunner），通过多 Agent 协作全自动生成百万字级网文长篇小说。

## 架构

- **Web 控制台**：Next.js 15 (App Router) + shadcn/ui + Tailwind CSS，可视化操作整个工作流
- **Remote Agent**：Node.js 服务，通过 node-pty 管理 Claude CLI / Gemini CLI 进程
- **小说引擎**：Shell 脚本 + Prompt 模板，编排编剧室多角色协作流程
- **通信**：Web ↔ Agent 通过 Socket.IO WebSocket
- **数据库**：SQLite (better-sqlite3)

## 开发环境

- 本地开发：`claude --chrome` 实现自动 UI 测试
- 部署环境：Docker 部署到远程服务器
- CLI 认证：使用 OAuth 登录（`claude auth login` / `gemini auth login`），不使用 API Key

## 目录结构

```
paperProject/
├── web-console/          # Next.js Web 控制台
├── remote-agent/         # CLI 进程管理服务
├── config/               # 项目配置（agents、pipeline、models）
├── lore/                 # 资料中台（世界观、角色、风格、上下文层）
├── outline/              # 情节规划（大纲、故事线、伏笔）
├── manuscript/           # 成稿
├── workspace/            # 编剧室工作区
├── checkpoints/          # 人类审阅检查点
├── scripts/              # 编排脚本
├── prompts/              # Prompt 模板库
└── docs/                 # 设计文档与实施计划
```

## 关键设计文档

- `docs/superpowers/specs/2026-04-09-novel-engine-design.md` — 小说引擎核心设计
- `docs/superpowers/specs/2026-04-09-web-console-design.md` — Web 控制台设计
- `docs/superpowers/plans/2026-04-09-novelforge-implementation.md` — 分阶段实施计划

## 开发命令

```bash
# 开发
pnpm dev           # 启动 Next.js 开发服务器
pnpm dev:agent     # 启动 Remote Agent

# 构建
pnpm build         # 构建 Next.js
pnpm build:agent   # 构建 Remote Agent

# 部署
docker compose up -d --build

# 小说引擎
bash scripts/init-project.sh     # 初始化小说项目
bash scripts/showrunner.sh       # 启动制片人管线
bash scripts/status.sh           # 查看状态
```

## 开发规范

- 使用 pnpm monorepo
- TypeScript strict mode
- 组件使用 shadcn/ui
- 状态管理使用 Zustand
- 实时通信使用 Socket.IO
- CLI 控制使用 node-pty
- 代码注释使用简体中文
- Commit 格式：`<type>(scope): <summary>`
