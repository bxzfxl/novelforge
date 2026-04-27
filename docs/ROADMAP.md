# NovelForge 路线图

> **最后更新**：2026-04-27
> 当前状态详见 [`STATUS.md`](./STATUS.md)。

---

## 版本规划

### Phase 1 — 免费版 MVP ✅ 已交付

**目标**：Electron 桌面应用骨架完整可用。用户自带 API Key，手动配置模型后可在本地使用。

**交付物**：
- Electron 桌面壳（Main + Preload + Renderer）
- 5 个 AI Provider（Anthropic / Google / OpenAI / Compatible / Custom）
- Writers' Room 编剧室（Architect→Writer→Critic+Continuity→Revise）
- Lore Engine 四级上下文金字塔（L0/L1/L2）
- Pipeline 管线状态机
- 完整 IPC 桥接层
- 四面板 Studio 布局 + 拖拽分隔线
- 项目初始化向导（快速 5 步 / 高级 7 类）
- AI 模型配置（添加/删除/测试连接/角色绑定）
- 管线监控 + 检查点审阅
- Markdown + YAML 章节存储
- 键盘快捷键 + 动画过渡
- electron-builder 打包配置（macOS/Windows/Linux）
- 37 条单元测试

### Phase 2 — 可用版（目标：0.5.0）

**目标**：用户可以完成端到端的写作流程。

| # | 任务 | 优先级 |
|---|------|--------|
| 1 | **Pipeline → WritersRoom → LoreEngine 编排连接** | P0 |
| 2 | **导出实现**（EPUB/TXT/DOCX/PDF） | P0 |
| 3 | AI 调用日志持久化到 `ai_call_logs` 表 | P0 |
| 4 | 角色绑定持久化 + 自动保存 | P0 |
| 5 | **WritersRoom / LoreEngine / AIClient 单元测试** | P1 |
| 6 | IPC 类型安全化（生成 renderer API 类型） | P1 |
| 7 | 管线恢复（从 checkpoint 继续） | P1 |
| 8 | 章节列表 + 稿件浏览页面 | P1 |

### Phase 3 — 专业版（目标：0.8.0）

**目标**：专业写作者可日常使用。

| # | 任务 | 优先级 |
|---|------|--------|
| 1 | **API Key 迁移到 OS 密钥链**（macOS Keychain / Windows Credential Vault / Linux libsecret） | P0 |
| 2 | **Electron `sandbox: true`** | P0 |
| 3 | 章节预览 — Markdown 渲染 + 分页 | P1 |
| 4 | 字数统计 + 写作进度仪表盘 | P1 |
| 5 | 多项目管理（切换/关闭/删除） | P1 |
| 6 | 写作历史 + Diff 回溯 | P2 |
| 7 | 自定义 Prompt 模板编辑器 | P2 |
| 8 | 深色/浅色主题切换 | P2 |
| 9 | E2E 测试完整实现（Playwright + Electron） | P1 |

### Phase 4 — 商业版（目标：1.0.0）

**目标**：可分发安装包，面向付费用户。

| # | 任务 |
|---|------|
| 1 | 自动更新（electron-updater） |
| 2 | 崩溃报告（Sentry / electron-crash-reporter） |
| 3 | 应用签名（macOS notarization + Windows Authenticode） |
| 4 | i18n 国际化（英文/日文） |
| 5 | 插件系统（第三方 Prompt 模板） |
| 6 | 团队协作（Git 同步 lore/outline/manuscript） |
| 7 | 云同步（可选，用户自选存储） |

---

## 技术债清理

| 项 | Phase | 说明 |
|----|-------|------|
| `camelToSnake` 重复定义 | 2 | 提取到 `db/queries/utils.ts` |
| ESLint/Prettier 配置 | 2 | 添加 `.eslintrc` + `.prettierrc` |
| IPC 处理函数 `any` 类型 | 2 | 替换为 shared 类型 |
| `sandbox: true` | 3 | 需验证所有 preload 路径 |
| 硬编码加密密钥 → OS 密钥链 | 3 | `crypto.ts` 重构 |
| `rate_limit_rpm` 执行 | 3 | 当前仅配置未生效 |

---

## 文档维护规则

- **`STATUS.md`** 每次 Phase 交付后更新
- **`ROADMAP.md`** 每次任务增减或优先级变化时更新
- **Spec 文档** 在开发前写完，开发中只做小修订
- **Plan 文档** 在 Spec 审阅通过后由 writing-plans skill 产出
- 完成或废弃的 Plan 移动到 `superpowers/plans/archive/`
