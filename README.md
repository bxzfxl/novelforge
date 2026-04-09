# NovelForge

AI 驱动的小说工程化写作系统，采用「编剧室 + 制片人」模式，通过多 Agent 协作全自动生成长篇小说。

## 架构

```
┌─────────────────┐     Socket.IO     ┌─────────────────┐
│   Web Console   │ ◄──────────────► │  Remote Agent   │
│  Next.js + UI   │    :3000 ↔ :9100  │  CLI 进程管理    │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
    SQLite DB                          Claude CLI / Gemini CLI
    (配置/状态)                         (AI 写作引擎)
```

- **Web Console** — Next.js 15 + shadcn/ui，可视化操作台
- **Remote Agent** — Node.js 服务，通过 Socket.IO 管理 Claude/Gemini CLI 进程
- **小说引擎** — Shell 脚本 + Prompt 模板，编排多角色协作写作流程

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- Claude CLI 或 Gemini CLI（已完成 OAuth 认证）

### 本地开发

```bash
# 1. 克隆并安装依赖
git clone https://github.com/bxzfxl/novelforge.git
cd novelforge
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，按需修改

# 3. 启动开发服务
pnpm dev          # Web Console (http://localhost:3000)
pnpm dev:agent    # Remote Agent (ws://localhost:9100)
```

### Docker 部署

```bash
# 1. 克隆项目
git clone https://github.com/bxzfxl/novelforge.git
cd novelforge

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：
#   - HOST_IP 改为服务器公网 IP 或域名
#   - PROJECT_ROOT 改为项目在宿主机的绝对路径
#   - 确认 Claude/Gemini CLI 路径正确

# 3. 确保 CLI 已认证
claude auth login
# 或 gemini auth login

# 4. 一键部署
docker compose up -d --build

# 5. 查看日志
docker compose logs -f

# 6. 停止服务
docker compose down
```

部署后访问 `http://<HOST_IP>:3000` 进入控制台。

## 目录结构

```
novelforge/
├── web-console/          # Next.js Web 控制台
├── remote-agent/         # CLI 进程管理服务
├── config/               # 项目配置（agents、pipeline、models）
├── lore/                 # 资料中台（世界观、角色、风格）
├── outline/              # 情节规划（大纲、故事线、伏笔）
├── manuscript/           # 成稿
├── workspace/            # 编剧室工作区
├── checkpoints/          # 人类审阅检查点
├── scripts/              # 编排脚本
├── prompts/              # Prompt 模板库
└── docs/                 # 设计文档
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Web Console 开发服务器 |
| `pnpm dev:agent` | 启动 Remote Agent 开发服务器 |
| `pnpm build` | 构建 Web Console |
| `pnpm build:agent` | 构建 Remote Agent |
| `docker compose up -d --build` | Docker 一键部署 |

## 小说引擎

```bash
bash scripts/init-project.sh     # 初始化小说项目
bash scripts/showrunner.sh       # 启动制片人管线
bash scripts/status.sh           # 查看当前状态
```

## 技术栈

- **前端**: Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind CSS
- **后端**: Node.js + Socket.IO + better-sqlite3
- **Agent**: Claude CLI / Gemini CLI (OAuth 认证)
- **部署**: Docker Compose
- **包管理**: pnpm monorepo

## 许可证

MIT
