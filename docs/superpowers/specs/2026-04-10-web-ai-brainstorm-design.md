# Feature 3：Web AI 辅助小说初始化 — 设计 Spec

> **状态**：🟡 占位 — 待 brainstorm 产出
> **最后更新**：2026-04-10
> **优先级**：P1
> **依赖**：Feature 1（模型配置）、Feature 2（novelforge-init skill，CLI 模式时）
> **所属路线图**：[ROADMAP.md # Feature 3](../../ROADMAP.md#feature-3web-ai-辅助初始化)

## 概述

在 Web 控制台提供 AI 辅助的项目初始化入口，复用 Feature 1 的 operation 配置（`project.brainstorm` 绑定的模型），并在 CLI 模式下直接调用 Feature 2 的 `novelforge-init` skill。

## 动机

- 当前 `/project/new` 只有手动 7 步向导，对"还没想清楚故事"的用户门槛太高
- Web 用户不应被迫切到终端才能享受 AI 头脑风暴
- 需要和 Feature 1 的操作绑定机制深度整合，验证设计可行性

## 已决策的关键点（brainstorm 阶段 1）

- ✅ **全局风暴**：一次性产出 title/world/chars/style/outline 全部字段（不是每步局部）
- ✅ **专用聊天 UI**：新建 `/project/new/brainstorm` 页面，非复用终端页
- ✅ **并列入口**：`/project/new` 改为选择页，AI / 手动 二选一
- ✅ **按钮触发 + JSON 输出**：用户点"生成草稿"，AI 以 JSON 格式产出，前端 parse 后预填向导

## 待澄清问题

- [ ] 对话历史的持久化策略：完全内存 / IndexedDB / 数据库？
- [ ] 会话中断恢复：浏览器关闭后能继续吗？
- [ ] JSON schema 的字段严格度：允许 AI 留空吗？
- [ ] API Key 模式和 CLI 模式的 UI 差异：用户能感知吗？
- [ ] 多轮对话的 token 用量控制：超过多少轮自动提醒？
- [ ] "跳过 AI 转手动" 是否保留当前已输入的信息？

## TODO

待 brainstorm 后填充：
- 完整架构图（已有草案）
- 前端组件树
- API 路由清单
- JSON schema 定义
- SSE 协议细节
- 降级策略决策树
- 测试用例
