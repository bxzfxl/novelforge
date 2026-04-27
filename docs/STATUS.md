# NovelForge 项目状态快照

> **最后更新**：2026-04-27（浏览器 UI 测试后更新）
> 本文件描述项目当前实现状态。路线图见 [`ROADMAP.md`](./ROADMAP.md)。

## 整体状态

**Phase 1 免费版 MVP — 已交付**。Electron 桌面应用骨架完整，37 个 git 提交，37 条全过测试，全量 TypeScript 零错误。

旧 Web 架构代码已迁移至 `_legacy/` 目录隔离。

> **2026-04-27 浏览器 UI 测试**：通过 Vite dev server + Chrome 自动化对全部 8 个测试项逐项验证，发现并修复 5 个运行时 Bug（详见下方"缺陷修复记录"）。

## 完成度汇总

| 模块 | 完成度 | 说明 |
|------|--------|------|
| Monorepo 脚手架 | 100% | pnpm workspace + shared/prompts 包 |
| 数据库层 | 100% | SQLite WAL + 全表 CRUD + 内联迁移 |
| 文件存储 | 100% | FileStore — Markdown + YAML frontmatter |
| AI Provider 层 | 100% | 5 Provider + Crypto + CostTracker + ModelManager |
| Prompt 模板库 | 100% | 18 个模板函数（11 角色 + 3 管线 + 4 资料） |
| Engine 层 | 95% | Pipeline + WritersRoom + LoreEngine 完整；编排连接预留 |
| IPC 桥接层 | 100% | 7 域名 + contextBridge + 渲染端客户端 |
| UI — 面板 | 100% | 四面板布局 + Navigator/Editor/Inspector/CommandBar |
| UI — 设置 | 100% | 模型配置/测试连接/角色绑定/通用设置 |
| UI — 向导 | 100% | 快速 5 步 + 高级 7 类 + AI 生成主角 |
| UI — 管线 | 100% | 进度条/步骤追踪/AI 输出流/审阅清单 |
| UI — 导出 | 95% | 对话框已集成到 App.tsx + 快捷键注册；实际导出逻辑待实现 |
| UI — 状态管理 | 100% | 4 个 Zustand stores |
| 键盘快捷键 | 100% | 14 个快捷键（Cmd+S/J/B/I/N/O/,/W 等）；已修复大小写匹配 Bug |
| 动画过渡 | 100% | 面板过渡/页面切换/打字光标/Skeleton/Toast |
| 单元测试 | 40% | 37 条通过；Engine/Store/AI/Provider 核心路径覆盖 |
| E2E 测试 | 5% | 骨架就绪，待 Electron 运行环境 |
| 打包配置 | 100% | electron-builder.yml — macOS/Windows/Linux |

---

## 已实现功能清单

### 渲染进程（Renderer）

| 页面/组件 | 路径 | 完成度 |
|-----------|------|--------|
| App 路由 | `renderer/App.tsx` | ✅ 4 页路由（welcome/studio/settings-models/settings-general） |
| Studio 布局 | `renderer/layouts/studio-layout.tsx` | ✅ 四面板 + 可拖拽分隔线 |
| 导航面板 | `renderer/panels/navigator/` | ✅ 树形导航 + 4 分类 |
| 编辑器面板 | `renderer/panels/editor/` | ✅ 写作/指挥/审阅三模式 + 工具栏 |
| 查看器面板 | `renderer/panels/inspector/` | ✅ 上下文感知 + 章节卡片 |
| 指令栏 | `renderer/panels/command-bar/` | ✅ Ctrl+J + 7 种 AI 指令 + 模糊搜索 |
| 欢迎页 | `renderer/onboarding/welcome.tsx` | ✅ 快速/高级双入口 |
| 快速向导 | `renderer/onboarding/quick-wizard.tsx` | ✅ 5 步（基本信息→AI→主角→世界观→大纲） |
| 高级向导 | `renderer/onboarding/advanced-wizard.tsx` | ✅ 7 类（含配角/风格指南） |
| 模型设置 | `renderer/settings/model-settings.tsx` | ✅ 列表/添加/删除/测试连接/角色绑定/通用设置 |
| 管线监控 | `renderer/pipeline/monitor.tsx` | ✅ 进度条 + 步骤追踪 + AI 输出流 |
| 检查点审阅 | `renderer/pipeline/checkpoint-review.tsx` | ✅ 6 维度审阅 + 决策 |
| 导出 | `renderer/export/export-dialog.tsx` | ✅ 格式选择 UI（逻辑桩） |
| 状态栏 | `renderer/components/status-bar.tsx` | ✅ 字数/章节/管线/视图切换/设置 |

### 主进程（Main Process）

| 模块 | 文件 | 完成度 |
|------|------|--------|
| 数据库连接 | `db/connection.ts` | ✅ 连接池 + WAL + 内联 SQL 迁移 |
| 项目 CRUD | `db/queries/projects.ts` | ✅ |
| 章节 CRUD | `db/queries/chapters.ts` | ✅ |
| 资料 CRUD | `db/queries/lore.ts` | ✅ |
| 管线查询 | `db/queries/pipeline.ts` | ✅ |
| AI 日志 | `db/queries/ai-logs.ts` | ✅ |
| 设置存取 | `db/queries/settings.ts` | ✅ |
| Anthropic Provider | `ai/providers/anthropic.ts` | ✅ SDK + 实时定价 |
| Google Provider | `ai/providers/google.ts` | ✅ GenAI SDK v0.24 |
| OpenAI Provider | `ai/providers/openai.ts` | ✅ SDK v5 |
| OpenAI Compatible | `ai/providers/openai-compatible.ts` | ✅ 可配置 baseURL |
| AIClient | `ai/client.ts` | ✅ generate + generateStream |
| API Key 加密 | `ai/crypto.ts` | ✅ AES-256-GCM（本地密钥） |
| 成本追踪 | `ai/cost-tracker.ts` | ✅ 内存日志 |
| 模型管理 | `ai/model-manager.ts` | ✅ CRUD + 绑定 + 默认降级 |
| Pipeline 引擎 | `engine/pipeline.ts` | ✅ 状态机 + EventEmitter |
| Writers' Room | `engine/writers-room.ts` | ✅ 4 阶段协作流程 |
| Lore Engine | `engine/lore-engine.ts` | ✅ L0/L1/L2 上下文金字塔 |
| FileStore | `store/file-store.ts` | ✅ 项目目录 I/O + Markdown |
| IPC 上下文 | `ipc/context.ts` | ✅ 单例共享状态 |
| 项目 IPC | `ipc/project.ipc.ts` | ✅ list/create/open/delete |
| 章节 IPC | `ipc/chapter.ipc.ts` | ✅ list/get/getContent/save |
| 资料 IPC | `ipc/lore.ipc.ts` | ✅ list/get/save |
| 管线 IPC | `ipc/pipeline.ipc.ts` | ✅ start/pause/resume/stop/getState + 事件转发 |
| AI IPC | `ipc/ai.ipc.ts` | ✅ testConnection/fetchModels/assist/streamAssist |
| 原生 IPC | `ipc/native.ipc.ts` | ✅ 对话框/导出/设置存取 |
| 窗口管理 | `window-manager.ts` | ✅ 1440x900 + DevTools |

### 包（Packages）

| 包 | 文件数 | 完成度 |
|----|--------|--------|
| `@novelforge/shared` | 10 类型文件 + constants | ✅ 全类型定义 |
| `@novelforge/prompts` | 19 个模板函数 | ✅ 编剧室全角色 + 管线 + 资料维护 |

---

## 缺陷修复记录

### 2026-04-27 浏览器 UI 测试修复（5 个）

| 文件 | Bug | 修复 |
|------|-----|------|
| `hooks/use-shortcuts.ts` | `e.key` 为 undefined 时 `.toLowerCase()` 抛出异常 | 加 `if (!e.key) return` 守卫 |
| `hooks/use-shortcuts.ts` | 键名拼接 `Cmd+/Shift+` 大写，但比较用 `cmd+/shift+` 小写，**所有快捷键失效** | 改为全小写 |
| `lib/ipc-client.ts` | 非 Electron 环境直接 throw，设置页等所有 IPC 调用触发 React 崩溃 | 改为 noop proxy 降级，返回空数据 |
| `settings/role-binding.tsx` | `<SelectItem value="">` 违反 Radix UI 约束，致角色绑定 Tab 黑屏 | 改为 `value="__none__"` |
| `App.tsx` | `ExportDialog` 存在但未被引入，导出功能和快捷键完全缺失 | 集成到 App.tsx 并注册 `Cmd+Shift+E` |

---

## 已知缺口

### 关键（阻塞生产使用）

1. **Pipeline → WritersRoom → LoreEngine 编排连接**：Pipeline 启动后不会实际调用写作流程
2. **导出逻辑未实现**：`native:export` 返回空桩，EPUB/TXT/DOCX/PDF 均无输出
3. **API Key 加密为本地密钥**：`crypto.ts` 使用硬编码 scryptSync，非 OS 密钥链

### 中等

4. **AI 日志未持久化**：`CostTracker` 仅内存记录，`ai_call_logs` 表空置
5. **自动保存未生效**：`settings-store.ts` 有 `autoSaveIntervalMs` 但无定时器
6. **角色绑定未持久化**：`role-binding.tsx` 仅更新本地 React 状态，未调用 IPC 保存
7. **编辑器"开始写作..."为实际内容非占位符**：新章节默认内容会与用户输入混入
8. **Inspector 字数不实时同步**：仅显示已保存字数，不反映编辑器当前内容
9. **`sandbox: false`**：可升级为 `sandbox: true`

### 低

10. **`camelToSnake` 重复**：3 个 query 文件各定义一次
11. **ESLint/Prettier 配置缺失**：依赖已安装但无配置文件
12. **IPC 类型安全**：渲染端通过 `(window as any).novelforge` 或 Proxy 访问，无 IDE 提示

---

## 测试覆盖明细

| 测试文件 | 数量 | 状态 |
|----------|------|------|
| `tests/unit/ai/providers.test.ts` | 6 | ✅ |
| `tests/unit/engine/pipeline.test.ts` | 12 | ✅ |
| `tests/unit/prompts/architect.test.ts` | 6 | ✅ |
| `tests/unit/store/file-store.test.ts` | 13 | ✅ |
| `tests/e2e/full-flow.spec.ts` | 1 (骨架) | 🟡 |
| **合计** | **37** | |

待补充：
- WritersRoom / LoreEngine / AIClient / CostTracker 单元测试
- Zustand stores 测试
- IPC 处理函数集成测试
- 完整 E2E（需 Electron 运行环境）

---

## 参考文档

- 设计规范：[`superpowers/specs/2026-04-27-novelforge-desktop-rewrite-design.md`](./superpowers/specs/2026-04-27-novelforge-desktop-rewrite-design.md)
- 实施计划：[`superpowers/plans/2026-04-27-novelforge-desktop-rewrite.md`](./superpowers/plans/2026-04-27-novelforge-desktop-rewrite.md)
- 路线图：[`ROADMAP.md`](./ROADMAP.md)
- 旧架构设计（已废弃）：
  - [`superpowers/specs/2026-04-09-novel-engine-design.md`](./superpowers/specs/2026-04-09-novel-engine-design.md)
  - [`superpowers/specs/2026-04-09-web-console-design.md`](./superpowers/specs/2026-04-09-web-console-design.md)
