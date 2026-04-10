# NovelForge 下一阶段路线图

> **最后更新**：2026-04-10
> 当前状态详见 [`STATUS.md`](./STATUS.md)。
> 每个 Feature 的细节 spec 位于 [`superpowers/specs/`](./superpowers/specs/)。

## 核心目标

把 NovelForge 从"CLI 订阅专用"系统，升级为 **"API Key 为主、CLI 为辅"的混合模型执行系统**，并补齐 AI 辅助创作入口和用量监控。

---

## Feature 概览

| # | Feature | 优先级 | 依赖 | 可独立推进 |
|---|---------|--------|------|-----------|
| 1 | 模型配置重构 + 用量监控强化 | P0（基础） | — | 是 |
| 2 | `novelforge-init` Skill | P1 | — | 是（不依赖 1） |
| 3 | Web AI 辅助初始化 | P1 | Feature 1 完成后 API 模式可跑；CLI 模式依赖 Feature 2 | 部分并行 |

### 执行顺序

```
Feature 1 ──────────────────────┐
                                 │
                                 ├──→ Feature 3 API Key 模式
                                 │
Feature 2 ──────────────────────┤
                                 │
                                 └──→ Feature 3 CLI 模式（收尾整合）
```

- **Feature 1** 必须先完成：后续所有 AI 调用都依赖操作→模型的抽象层
- **Feature 2** 可和 Feature 1 **并行**：Skill 是独立包，不依赖 Web 配置
- **Feature 3** 两阶段：
  - 阶段 A：Feature 1 完成后，先跑通 API Key 模式（不依赖 Feature 2）
  - 阶段 B：Feature 2 完成后，补上 CLI 模式（调用 novelforge-init skill）

---

## Feature 1：模型配置重构 + 用量监控强化

**目标**：把"按 provider 配置"变成"按 AI 操作配置"，补齐 API Key 执行路径和成本监控。

**Spec**：[`superpowers/specs/2026-04-10-model-config-refactor-design.md`](./superpowers/specs/2026-04-10-model-config-refactor-design.md)

### 1.1 AI 操作抽象层

- 新建 `ai_operations` 表：每条记录一个"操作"（`id`、`category`、`description`、`required_capabilities`）
- 新建 `operation_model_bindings` 表：`operation_id → model_id → mode (api|cli) → priority`
- 初始 operation 清单（≥10 个）：
  - `project.brainstorm` — 新项目头脑风暴
  - `lore.generate` — 生成/扩充世界观、角色卡
  - `outline.plan` — 大纲规划
  - `showrunner.decide` — 制片人决策
  - `writer.main` — 主写手
  - `writer.atmosphere` — 氛围润色
  - `writer.revise` — 修订
  - `critic.review` — 审阅
  - `continuity.check` — 连贯性校对
  - `context.refresh` — L0/L1 上下文刷新

### 1.2 Provider 适配层

- 定义 `ProviderAdapter` 接口：
  ```ts
  interface ProviderAdapter {
    id: string;
    mode: 'api' | 'cli';
    execute(params: ExecuteParams): Promise<ExecuteResult>;
    stream?(params: ExecuteParams): AsyncIterable<string>;
  }
  ```
- 实现清单：
  - `AnthropicAPIAdapter`（Claude API）
  - `OpenAIAPIAdapter`（GPT 系列）
  - `DeepSeekAPIAdapter`
  - `GeminiAPIAdapter`
  - `ClaudeCLIAdapter`（包装 Remote Agent `spawnProcess`）
  - `GeminiCLIAdapter`
- 放置位置：`web-console/src/lib/ai-providers/`

### 1.3 模型成本表

- 新建 `model_pricing` 表：`model_id`、`input_price_per_1m`、`output_price_per_1m`、`currency`、`effective_from`
- 预置当前主流模型价格：
  - Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5
  - GPT-4o / GPT-5 / o3
  - DeepSeek V3 / R1
  - Gemini 2.5 Pro / Flash
- 修改 `insertTokenUsage()` 同时计算 `cost_usd`

### 1.4 Settings 页重构

- 主界面从"按 provider"改为"按 operation"
- 每个 operation 卡片：
  - 选择主模型 + 模式（API / CLI）
  - 选择降级模型（主模型不可用时）
  - 试运行按钮（发 ping prompt 验证连通）
- "Provider 凭证"降级为次级页签（API keys / CLI paths 配置）

### 1.5 用量监控仪表盘（新页面 `/usage`）

- 总成本卡片（今日 / 本周 / 本月 / 累计）
- 按 operation 饼图
- 按 model 饼图
- 时间序列折线（成本 / tokens）
- 预算告警规则（`daily_budget_usd`、`alert_threshold_percent`）
- 超支时顶部 banner 红警

### 1.6 代码迁移

- `scripts/writers-room.sh` 和其他 CLI 脚本：当前直接调 `$CLAUDE_CMD`，改为查询 `operation_model_bindings` 后调对应 adapter
- `process-manager.ts`：增加 `runOperation(opId, params)` 高层接口，屏蔽 adapter 差异

### 验收标准

- [ ] 10 个 operation 的默认绑定可从 Settings 修改
- [ ] 用 DeepSeek API Key 能跑通一个完整写作任务（非 CLI）
- [ ] `/usage` 页显示成本（误差 < 5%）
- [ ] 预算告警能在 CLI 和 Web 两端生效

---

## Feature 2：`novelforge-init` Skill

**目标**：把小说项目初始化的头脑风暴流程包成 superpowers 风格的 skill，CLI 用户可以直接在终端里调用。

**Spec**：[`superpowers/specs/2026-04-10-novelforge-init-skill-design.md`](./superpowers/specs/2026-04-10-novelforge-init-skill-design.md)

### 2.1 Skill 包结构

```
.claude/skills/novelforge-init/
├── SKILL.md                    # 主 prompt + 触发条件
├── scripts/
│   ├── detect-project-root.sh  # 探测 PROJECT_ROOT
│   ├── write-project-yaml.sh   # 生成 config/project.yaml
│   ├── write-lore-world.sh     # 生成 lore/world/core-rules.md
│   ├── write-lore-character.sh # 生成单个角色卡
│   ├── write-style.sh          # 生成 lore/style/voice.md
│   └── write-outline.sh        # 生成 outline/master-outline.md
└── templates/
    └── (模板文件，供 scripts 使用)
```

### 2.2 Skill 主逻辑

- SKILL.md 包含：
  - 使用场景说明（何时触发）
  - 针对小说的头脑风暴 prompt（借鉴 superpowers brainstorming 但更具体）
  - 信息收集顺序：核心概念 → 世界观 → 主角 → 冲突 → 风格 → 大纲
  - 每步提问技巧（一次一问，多选优先）
  - 收尾阶段识别：当 Claude 判断信息足够，调用 scripts 逐步写文件

### 2.3 CLI 独立使用流程

```
用户场景：
  $ cd my-novel-project
  $ claude
  > 帮我初始化一个新的小说项目
  [Claude 识别并加载 novelforge-init skill]
  > 好的！先告诉我...
  [多轮对话]
  > 信息足够了，我开始写入项目文件...
  [skill 调用 write-*.sh]
  > 完成。7 个文件已创建。
```

### 2.4 验收标准

- [ ] CLI 用户可以独立完成全流程，无需 Web 介入
- [ ] 3 种题材（玄幻 / 都市 / 科幻）各跑一遍验证
- [ ] 生成的文件与 Web 向导手动模式产出的文件结构一致
- [ ] Skill 可被 `.claude/skills/` 发现和触发

---

## Feature 3：Web AI 辅助初始化

**目标**：在 Web 控制台提供 AI 辅助的项目初始化入口，复用 Feature 1 的 operation 配置和 Feature 2 的 skill。

**Spec**：[`superpowers/specs/2026-04-10-web-ai-brainstorm-design.md`](./superpowers/specs/2026-04-10-web-ai-brainstorm-design.md)

### 3.1 用户流程

```
/project/new (选择页)
   ├─ "🤖 AI 辅助构思"  → /project/new/brainstorm (聊天 UI)
   │                       ↓
   │                   多轮对话
   │                       ↓
   │                   "生成草稿" → JSON 解析 → 预填表单
   │                       ↓
   │                   7 步向导（审阅模式）
   │                       ↓
   │                   提交 → 落盘
   │
   └─ "✍️ 手动填写"    → 现有 7 步向导
```

### 3.2 后端路由

- `POST /api/brainstorm/start` — 开启一次 brainstorm 会话，返回 `session_id`
- `POST /api/brainstorm/message` — 发送消息，返回 SSE 流式响应
- `POST /api/brainstorm/generate-draft` — 要求 AI 输出结构化 JSON 草稿
- `DELETE /api/brainstorm/:session_id` — 结束会话

### 3.3 模式分支

- 从 `operation_model_bindings` 查 `project.brainstorm` 绑定
- **API Key 模式**：Next.js 路由调用 adapter，维护对话历史，返回 SSE
- **CLI 模式**：Remote Agent 启动 `claude` 进程，加载 `novelforge-init` skill，pty 流式转发

### 3.4 UI 组件

- 新页面 `/project/new/brainstorm/page.tsx`
- 气泡组件 `components/brainstorm/message-bubble.tsx`
- 输入组件 `components/brainstorm/message-input.tsx`
- 新 store `stores/brainstorm-store.ts`
- 修改 `/project/new/page.tsx` 为选择页

### 3.5 草稿解析 + 预填

- JSON schema（Zod 校验）
- 预填 `useProjectInitStore`
- 跳转向导 step 0，banner 提示"已由 AI 预填，可自由修改"

### 3.6 降级 + 错误处理

- API Key 失效 → 弹窗提示，转手动
- CLI 模式未安装 claude → 自动切 API 模式
- JSON 解析失败 → 重试按钮 + 原文查看
- SSE 断线 → 显示"重连中…"

### 验收标准

- [ ] API Key 模式下，用户能完成完整 brainstorm → 预填 → 提交
- [ ] CLI 模式下（通过 skill），行为与 API 模式一致
- [ ] 切换模式不影响用户体验
- [ ] 网络异常时能恢复或降级到手动

---

## 其他待办（非本轮重点）

| 项 | 类别 | 说明 |
|----|------|------|
| 资料库 / 编剧室 / 稿件 / 检查点 页面实现 | UI 补完 | 4 个骨架页面 |
| 自动化测试套件 | 质量 | 单元 + e2e |
| Docker CLI 挂载方案完善 | 部署 | 让 Docker 容器访问宿主 claude CLI |
| `rate_limit_rpm` 执行 | 质量 | 现仅配置未生效 |
| 编辑器集成（VSCode / JetBrains） | 扩展 | 未来规划 |

---

## 文档维护规则

- **`STATUS.md`** 每次完成一个 Feature 后更新
- **`ROADMAP.md`** 每次 Feature 增减或优先级变化时更新
- **Spec 文档** 在 Feature 开发前写完，开发中只做小修订
- **Plan 文档** 在 Spec 审阅通过后由 writing-plans skill 产出
- 完成或废弃的 Plan 移动到 `superpowers/plans/archive/`
