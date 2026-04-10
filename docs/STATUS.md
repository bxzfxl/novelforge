# NovelForge 项目状态快照

> **最后更新**：2026-04-10
> 本文件描述项目当前实现状态。路线图和开发计划见 [`ROADMAP.md`](./ROADMAP.md)。

## 整体完成度

约 **85%** — Feature 1（模型配置重构）已完整落地，AI 执行层、用量监控、Settings/Usage UI 全部实现。

| 模块 | 完成度 | 状态 |
|------|--------|------|
| Web 控制台骨架 | 100% | ✅ 8 个页面全部存在 |
| 数据库层 | 100% | ✅ schema + queries 完整 |
| Remote Agent | 90% | ✅ 进程管理 / 文件 I/O / Socket.IO 协议完整 |
| CLI 编排脚本 | 100% | ✅ 7 个 shell 脚本 |
| Prompt 模板 | 100% | ✅ 13 个写作角色模板 |
| 模型配置 | 100% | ✅ 19 operation + 6 预设 + 8 provider 适配层 |
| 用量监控 | 100% | ✅ 成本计算 + 预算告警 + dashboard + 失败快照 |
| AI 辅助初始化 | 0% | ❌ 仅有手动 7 步向导 |
| 测试 | 100% | ✅ 140 vitest 测试全通过（单元 + 集成 + E2E smoke） |
| Docker 部署 | 80% | ✅ 本地可跑，远端挂载 CLI 待补 |

---

## 已实现功能清单

### Web 页面（`web-console/src/app/`）

| 页面 | 路径 | 完成度 | 说明 |
|------|------|--------|------|
| 仪表盘 | `/` | ✅ 完整 | Agent 状态、进程统计、项目初始化引导 |
| 项目初始化向导 | `/project/new` | ✅ 手动模式完整 | 7 步向导 + 预填逻辑 |
| 管线控制 | `/pipeline` | ✅ 完整 | 启动/状态/进度/token 展示 |
| 设置 | `/settings` | ⚠️ UI 完整但后端断层 | 配置写入 `config` 表，无执行路径 |
| 资料库 | `/lore` | 🟡 骨架 | 待实现：浏览/编辑/AI 扩充 |
| 编剧室 | `/writers-room` | 🟡 骨架 | 待实现：角色任务分发可视化 |
| 稿件 | `/manuscript` | 🟡 骨架 | 待实现：章节浏览 |
| 检查点 | `/checkpoints` | 🟡 骨架 | 待实现：决策审阅 |
| 终端 | `/terminal` | ✅ 完整 | xterm.js + Claude/Gemini pty |

### API Routes（`web-console/src/app/api/`）

| 路径 | 方法 | 完成度 |
|------|------|--------|
| `/api/health` | GET | ✅ |
| `/api/config` | GET / PUT | ✅ |
| `/api/pipeline/status` | GET | ✅ |
| `/api/pipeline/start` | POST | ✅ |
| `/api/project/status` | GET | ✅ |
| `/api/project/init` | POST | ✅ |

### Remote Agent（`remote-agent/src/`）

| 文件 | 能力 | 完成度 |
|------|------|--------|
| `index.ts` | Socket.IO server + 事件路由 + 终端会话 | ✅ |
| `process-manager.ts` | 子进程生命周期 + 并发限制 + token 聚合 | ✅ |
| `types.ts` | 客户端/服务端事件类型定义 | ✅ |

### 数据库（`web-console/src/lib/db/schema.ts`）

| 表 | 用途 | 完成度 |
|------|------|--------|
| `config` | kv 配置（API keys、URL、其他） | ✅ |
| `processes` | 进程记录 + 每进程 token 统计 | ✅ |
| `token_usage` | 细粒度 token 记录（per process） | ✅ |
| `events` | 系统事件流 | ✅ |

### 已存在的 Prompt 模板（`prompts/`）

```
prompts/
├── lore/
│   ├── generate-summary.md
│   └── refresh-context.md
├── review/
│   ├── continuity.md
│   └── critic.md
├── showrunner/
│   ├── create-brief.md
│   └── decide.md
└── writers/
    ├── architect.md
    ├── atmosphere.md
    ├── character-advocate.md
    ├── final-revise.md
    ├── foreshadow-weaver.md
    ├── main-writer.md
    └── revise.md
```

### 已有 Shell 脚本（`scripts/`）

| 脚本 | 用途 |
|------|------|
| `init-project.sh` | 项目目录初始化（与 Web 向导功能重叠） |
| `showrunner.sh` | 管线主循环 |
| `writers-room.sh` | 多角色协作产章 |
| `lore-update.sh` | 上下文刷新 |
| `checkpoint.sh` | 检查点审阅 |
| `status.sh` | 状态查询 |
| `start-agent.sh` | Agent 启动脚本 |

---

## 关键缺口

### 1. UI ↔ 执行层断层（最大缺口）
Settings 页面允许配置 OpenAI / DeepSeek 的 `apiBase` 和 `apiKeyConfigKey`，**但代码库从未实际 `fetch` 过它们**。所有真正的 AI 调用都走 `spawn('claude'|'gemini')` CLI。需要补齐 Provider 适配层。

### 2. 无 "操作 → 模型" 映射
当前只有"按 provider 配置"，无"哪个操作用哪个模型"的抽象。`config/agents.yaml` 有 role → model 硬编码，但 CLI 调用时 model 字段被忽略（CLI 用用户本机 `~/.claude` 配置）。

### 3. 无成本计算
`token_usage` 表有 token 数，但无每模型单价表，无法算出花了多少钱。切到 API Key 模式后这是严重问题。

### 4. 无用量 Dashboard
管线页只显示一个总 token 数。缺按操作 / 按模型 / 按时间的拆分视图。

### 5. AI 初始化为 0
所有 AI 辅助构思能力（世界观、角色、大纲、风格）完全缺失，用户只能纯手工填写。

### 6. 子页面骨架
资料库 / 编剧室 / 稿件 / 检查点四个页面仅有占位，无实际交互。

### 7. 无测试
0 条自动化测试。完全依赖手动 e2e。

---

## 已知技术债

| 项 | 描述 | 优先级 |
|----|------|--------|
| `project.yaml` title 为空时的 status 判定 | 现用字符串比较 `status !== 'initializing'`，易错 | 低 |
| `scripts/init-project.sh` vs Web 向导重叠 | 两套初始化流程，需要决定主推哪个 | 中 |
| `process-manager.ts` 的 `spawn` 不传 model 参数 | CLI 调用时 model 字段被忽略 | 高（Feature 1 会修） |
| Settings 页的 `DEFAULT_PROVIDERS` 数组硬编码 | 添加新 provider 需要改代码 | 中 |
| 无 rate limit 执行 | 配置有 `rate_limit_rpm` 字段但无代码使用 | 中 |

---

## 参考文档

- 设计规范：[`superpowers/specs/2026-04-09-development-standards-design.md`](./superpowers/specs/2026-04-09-development-standards-design.md)
- 小说引擎设计：[`superpowers/specs/2026-04-09-novel-engine-design.md`](./superpowers/specs/2026-04-09-novel-engine-design.md)
- Web 控制台设计：[`superpowers/specs/2026-04-09-web-console-design.md`](./superpowers/specs/2026-04-09-web-console-design.md)
- 历史 Phase 1-7 实施计划：[`superpowers/plans/archive/2026-04-09-novelforge-implementation.md`](./superpowers/plans/archive/2026-04-09-novelforge-implementation.md)
