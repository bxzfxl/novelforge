# Feature 1：模型配置重构 + 用量监控强化 — 设计 Spec

> **状态**：✅ 设计已通过 brainstorm，待 writing-plans 产出实施计划
> **最后更新**：2026-04-10
> **优先级**：P0（后续 Feature 的基础）
> **所属路线图**：[ROADMAP.md # Feature 1](../../ROADMAP.md#feature-1模型配置重构--用量监控强化)

---

## 1. 动机与目标

### 问题

当前 NovelForge 有三个关键问题：

1. **UI ↔ 执行层断层**：Settings 页允许配置 OpenAI/DeepSeek 的 `apiBase` 和 `apiKeyConfigKey`，但代码库从未实际 `fetch` 过它们。所有 AI 调用都走 `spawn('claude'|'gemini')` CLI。
2. **无"操作→模型"映射**：`config/agents.yaml` 有 role→model 硬编码，但 CLI 调用时 model 字段被忽略。用户无法说"给 `writer.main` 用 Opus，给 `writer.atmosphere` 用 DeepSeek"。
3. **无成本计算**：`token_usage` 表有 token 数，但无每模型单价表，切到 API Key 模式后无法知道花了多少钱。

### 目标

- **新用户打开 Settings** 立即看到所有 AI 操作清单，每项独立选模型
- **API Key 和 CLI 两种模式并存**，同一个模型（如 Claude Opus 4.6）的 API 和 CLI 在 UI 里是两个独立选项
- **用量监控**能精确算出成本，按 operation / model 拆分，展示时间趋势和预算阻断
- **失败降级**不是"偷偷换模型继续"，而是"拍快照暂停、用户修好后恢复"
- **减少渠道**：默认推荐 2-provider 配置（Anthropic + DeepSeek），既能保证质量又能控制成本

---

## 2. 核心设计决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| 1 | Operation 粒度 | 细粒度 19 个 + 类别继承 + 描述 + 启用开关 | 既有细分能力又有批量配置 |
| 2 | 失败处理 | 快照 + 手动恢复，**非自动降级** | 不偷偷降低质量，用户掌控 |
| 3 | Settings 页改造 | 彻底重做，旧 UI 删除 | 避免新旧 UI 脱节 |
| 4 | 预算告警 | 80/100/120 三级阈值 + 全局单预算 + `0=无限制` | 预警 + 软阻 + 硬底线 |
| 5 | 首次启动 | 智能预设，用户一键应用 | 降低激活成本 |
| 6 | `writer.main` 默认 | Sonnet 4.6（带备注） | 面向读者的文字不妥协 |
| 7 | CLI/API 区分 | 同模型的两种模式作为独立 target | 数据模型清晰 |
| 8 | 模型目标 | model × mode 组合存为独立行 | 支持可用性检测与定价区分 |

---

## 3. Operation 清单（19 个）

### 3.1 类别与职责原则

- **指挥层**（flagship tier，Claude Opus 4.6 / Gemini 3.1 Pro 级别）— 涉及全局设计、结构规划、创意探索
- **质量门**（mid tier，Claude Sonnet 4.6 级别）— 读者直接看到的文字、最终质检、文学鉴赏
- **执行层**（efficient tier，DeepSeek V3.2 级别）— 根据现有信息进行机械加工、总结、核对

### 3.2 完整清单

| 类别 | Operation ID | 显示名 | 描述 | 推荐 Tier |
|------|-------------|-------|------|----------|
| project | `project.brainstorm` | 新项目头脑风暴 | 多轮对话收集小说需求，产出世界观/角色/大纲草稿 | **指挥** |
| lore | `lore.world.generate` | 世界观生成 | 基于题材和关键词生成或扩充世界设定 | 质量门 |
| lore | `lore.character.generate` | 角色生成 | 生成或扩充单个角色卡 | 质量门 |
| lore | `lore.style.generate` | 写作风格定义 | 确定叙事视角、语言基调、参考作品 | 质量门 |
| outline | `outline.volume.plan` | 卷大纲规划 | 规划一整卷的主线、分支、节奏拐点 | **指挥** |
| outline | `outline.chapter.plan` | 章大纲细化 | 把卷大纲拆解为具体章节的场景清单 | 质量门 |
| showrunner | `showrunner.decide` | 制片人决策 | 判断下一步动作：继续写、更新资料、触发检查点 | **指挥** |
| showrunner | `showrunner.brief` | 章节任务简报 | 为编剧室生成本章写作任务 | 执行 |
| writer | `writer.architect` | 章节架构师 | 先行分析章节结构、场景切分、冲突节奏 | **指挥** |
| writer | `writer.main` | 主写手 | 根据架构蓝图产出章节正文（默认 Sonnet，带质量备注） | 质量门 |
| writer | `writer.character_advocate` | 角色代言人 | 逐角色检查言行是否符合设定 | 执行 |
| writer | `writer.atmosphere` | 氛围师 | 强化场景描写、情绪基调、五感细节 | 执行 |
| writer | `writer.foreshadow_weaver` | 伏笔编织者 | 植入暗线、回收前伏笔 | 执行 |
| writer | `writer.revise` | 第一轮修订 | 统稿后修复连贯性和表达 | 执行 |
| writer | `writer.final_revise` | 终审润色 | 最后一遍语法/流畅度打磨 | 质量门 |
| review | `critic.review` | 文学评审 | 从读者/编辑视角评价情节、节奏、吸引力 | 质量门 |
| review | `continuity.check` | 连贯性校对 | 核对事实、时间线、世界规则一致性 | 执行 |
| context | `context.l0.refresh` | L0 全局摘要刷新 | 整合所有资料生成顶层摘要 | 执行 |
| context | `context.l1.refresh` | L1 卷级摘要刷新 | 整合最近章节生成卷级上下文 | 执行 |

### 3.3 类别继承机制

每个类别（project/lore/outline/showrunner/writer/review/context）有一个**类别默认 model_target**。所有子 operation 默认继承类别设置，可被**操作级覆盖**。解析优先级：

```
operation override → category default → 未配置（抛 OperationNotConfiguredError）
```

每个 operation 有 `is_enabled` 开关，关闭后调用时抛 `OperationDisabledError`，管线可在对应阶段跳过。

---

## 4. 数据模型

### 4.1 新增表

```sql
-- ① 模型目标：model × mode 组合
CREATE TABLE model_targets (
  id TEXT PRIMARY KEY,                    -- "claude-opus-4-6:api"
  model_id TEXT NOT NULL,                 -- "claude-opus-4-6"
  provider TEXT NOT NULL,                 -- "anthropic" | "openai" | "google" | "deepseek" | "xai"
  mode TEXT NOT NULL CHECK(mode IN ('api', 'cli')),
  display_name TEXT NOT NULL,             -- "Claude Opus 4.6 (API)"
  description TEXT,
  -- 定价（CLI 模式为 NULL）
  input_price_per_1m REAL,
  output_price_per_1m REAL,
  cache_read_price_per_1m REAL,
  cache_write_5m_price_per_1m REAL,
  cache_write_1h_price_per_1m REAL,
  -- 配置
  context_window INTEGER,
  max_output_tokens INTEGER,
  -- 可用性
  available INTEGER NOT NULL DEFAULT 0,
  availability_reason TEXT,
  last_checked_at TEXT,
  -- 元信息
  tier TEXT CHECK(tier IN ('flagship','mid','efficient','reasoning')),
  price_manually_edited INTEGER NOT NULL DEFAULT 0,  -- 1 = 不被"刷新定价"覆盖
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ② AI 操作定义
CREATE TABLE ai_operations (
  id TEXT PRIMARY KEY,                    -- "writer.architect"
  category TEXT NOT NULL,                 -- "writer"
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_tier TEXT,
  recommended_rationale TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ③ 类别级默认（继承上游）
CREATE TABLE operation_category_defaults (
  category TEXT PRIMARY KEY,
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ④ 操作级覆盖（继承下游）
CREATE TABLE operation_overrides (
  operation_id TEXT PRIMARY KEY REFERENCES ai_operations(id),
  target_id TEXT NOT NULL REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑤ 预算配置（单行表）
CREATE TABLE budget_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_budget_usd REAL NOT NULL DEFAULT 0,   -- 0 = 无限制
  warn_threshold_pct INTEGER NOT NULL DEFAULT 80,
  soft_block_threshold_pct INTEGER NOT NULL DEFAULT 100,
  hard_block_threshold_pct INTEGER NOT NULL DEFAULT 120,
  fallback_target_id TEXT REFERENCES model_targets(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ⑥ 管线快照（大 payload 在文件）
CREATE TABLE pipeline_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  attempted_target_id TEXT NOT NULL,
  failure_category TEXT NOT NULL CHECK(failure_category IN ('transient','permanent','unknown')),
  failure_message TEXT NOT NULL,
  payload_file_path TEXT NOT NULL,
  ai_summary TEXT,                            -- 兜底模型生成的摘要（可空）
  resume_hint TEXT,                           -- AI 恢复建议（可空）
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resumed','abandoned')),
  resumed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 4.2 已有表扩展

```sql
ALTER TABLE token_usage ADD COLUMN target_id TEXT REFERENCES model_targets(id);
ALTER TABLE token_usage ADD COLUMN operation_id TEXT REFERENCES ai_operations(id);
ALTER TABLE token_usage ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_usage ADD COLUMN was_cli_mode INTEGER NOT NULL DEFAULT 0;
```

### 4.3 Seed 数据

启动时如果表为空，自动 seed：

**model_targets**（~30 条，跨 8 个 provider）。

**定价来源**：[LLM-Price 仓库](https://github.com/syaoranwe/LLM-Price) + 各 provider 官方文档（2026-04）。CNY 价格按 ¥7/USD 换算。

**定价刷新机制**：Settings → 凭证管理 Tab 顶部提供"刷新定价"按钮，触发从代码内置的定价常量表重新写入 `model_targets` 的价格字段；未来可扩展为从远端拉取官方定价 JSON。手动修改某一条后标记为 `price_manually_edited=1`，不被刷新覆盖。

#### 西方 Provider

| 模型 | Target ID | Input (USD/M) | Output (USD/M) | Cache Read | Tier |
|------|-----------|---------------|----------------|-----------|------|
| Claude Opus 4.6 | `claude-opus-4-6:api` | $5.00 | $25.00 | $0.50 | flagship |
| Claude Sonnet 4.6 | `claude-sonnet-4-6:api` | $3.00 | $15.00 | $0.30 | mid |
| Claude Haiku 4.5 | `claude-haiku-4-5:api` | $1.00 | $5.00 | $0.10 | efficient |
| GPT-5.4 | `gpt-5.4:api` | $2.50 | $15.00 | $0.25 | flagship |
| GPT-5.4 Mini | `gpt-5.4-mini:api` | $0.75 | $4.50 | $0.075 | mid |
| GPT-5 Mini | `gpt-5-mini:api` | $0.25 | $2.00 | $0.025 | efficient |
| GPT-5 Nano | `gpt-5-nano:api` | $0.05 | $0.40 | $0.005 | efficient |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro:api` | $2.00 | $12.00 | $0.20 | flagship |
| Gemini 2.5 Pro | `gemini-2.5-pro:api` | $1.25 | $10.00 | $0.125 | mid |
| Gemini 2.5 Flash | `gemini-2.5-flash:api` | $0.30 | $2.50 | $0.03 | efficient |
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite:api` | $0.10 | $0.40 | $0.01 | efficient |
| DeepSeek V3.2 | `deepseek-chat:api` | $0.28 | $0.42 | $0.028 | efficient |
| DeepSeek Reasoner (R1) | `deepseek-reasoner:api` | $0.28 | $0.42 | $0.028 | reasoning |

#### 中文 Provider（中文文学写作优化）

| 模型 | Target ID | Input (USD/M) | Output (USD/M) | Notes |
|------|-----------|---------------|----------------|-------|
| Zhipu GLM-5 | `glm-5:api` | $0.57 | $2.57 | 清华系，中文文学表达强 |
| Alibaba Qwen3-Max | `qwen3-max:api` | $0.36 | $1.43 | 阿里旗舰 |
| Alibaba Qwen3.5-Plus | `qwen3.5-plus:api` | $0.11 | $0.69 | 性价比均衡 |
| Alibaba Qwen3.5-Flash | `qwen3.5-flash:api` | $0.029 | $0.286 | **Qwen 系列最便宜** |
| Moonshot Kimi-K2.5 | `kimi-k2.5:api` | $0.57 | $3.00 | 长上下文强项 |

> ⚠️ **中文 Provider 注意事项**：
> - 多数有输出内容审查，**玄幻/科幻/成人向**题材需评估是否合规
> - 默认不启用，用户在凭证管理页手动填 Key 后激活
> - 预设 "中文优化" 才会使用这些 target

#### CLI 模式 Target

| 模型 | Target ID | 触发方式 |
|------|-----------|---------|
| Claude Opus 4.6 (CLI) | `claude-opus-4-6:cli` | 本机 `claude` CLI + Max 订阅 |
| Claude Sonnet 4.6 (CLI) | `claude-sonnet-4-6:cli` | 同上 |
| Claude Haiku 4.5 (CLI) | `claude-haiku-4-5:cli` | 同上 |
| Gemini 3.1 Pro (CLI) | `gemini-3.1-pro:cli` | 本机 `gemini` CLI + 订阅 |
| Gemini 2.5 Flash (CLI) | `gemini-2.5-flash:cli` | 同上 |

> CLI 模式下定价字段为 NULL，成本计 0，仍记录 token 数用于"CLI 节省"统计。

**ai_operations**：19 条（见 § 3.2）

**budget_config**：一行，`daily_budget_usd=0`（无限制）

---

## 5. Provider 适配层

### 5.1 接口定义

```ts
// web-console/src/lib/ai-providers/types.ts

export interface ExecuteParams {
  targetId: string;
  operationId: string;
  systemPrompt?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  cacheBreakpoints?: Array<{ messageIndex: number }>;
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ExecuteResult {
  content: string;
  usage: Usage;
  costUsd: number;                       // CLI 模式为 0
  wasCliMode: boolean;
  rawResponse?: unknown;
  finishReason: 'stop' | 'length' | 'error';
}

export interface StreamChunk {
  type: 'content' | 'usage' | 'done' | 'error';
  delta?: string;
  usage?: Usage;
  error?: string;
}

export interface ProviderAdapter {
  id: string;                            // "anthropic-api" | "anthropic-cli" | ...
  mode: 'api' | 'cli';
  supports(targetId: string): boolean;
  detectAvailability(): Promise<{ available: boolean; reason?: string }>;
  execute(params: ExecuteParams): Promise<ExecuteResult>;
  stream(params: ExecuteParams): AsyncIterable<StreamChunk>;
}
```

### 5.2 适配器清单

| Adapter | 底层 | Token 来源 | 备注 |
|---------|------|-----------|------|
| `AnthropicAPIAdapter` | `fetch` `api.anthropic.com/v1/messages` | 响应 `usage` | 支持 prompt caching |
| `OpenAIAPIAdapter` | `fetch` `api.openai.com/v1/chat/completions` | 响应 `usage` | — |
| `DeepSeekAPIAdapter` | `fetch` `api.deepseek.com/chat/completions` | 响应 `usage` | OpenAI 兼容协议 |
| `GeminiAPIAdapter` | `fetch` `generativelanguage.googleapis.com/v1beta/...` | 响应 `usageMetadata` | — |
| `QwenAPIAdapter` | `fetch` `dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | 响应 `usage` | OpenAI 兼容协议 |
| `ZhipuAPIAdapter` | `fetch` `open.bigmodel.cn/api/paas/v4/chat/completions` | 响应 `usage` | OpenAI 兼容 |
| `MoonshotAPIAdapter` | `fetch` `api.moonshot.cn/v1/chat/completions` | 响应 `usage` | OpenAI 兼容 |
| `ClaudeCLIAdapter` | Agent `process:spawn` + `claude -p "..." --output-format stream-json` | 解析 stream-json 的 `usage` | 成本 0 |
| `GeminiCLIAdapter` | Agent `process:spawn` + `gemini -p "..."` | 解析输出（待验证格式） | 成本 0 |

> **注意**：Qwen/Zhipu/Moonshot 均提供 OpenAI 兼容协议，可以复用 `OpenAIAPIAdapter` 的基础逻辑，仅改变 baseURL。实现上可以是同一个类配不同的 `baseURL` 配置，而不是 3 个独立类。

### 5.3 工厂与注册

```ts
// web-console/src/lib/ai-providers/factory.ts
const adapters = new Map<string, ProviderAdapter>();
export function registerAdapter(a: ProviderAdapter) { adapters.set(a.id, a); }
export async function getAdapterForTarget(targetId: string): Promise<ProviderAdapter> {
  const target = await db.getModelTarget(targetId);
  if (!target) throw new Error(`Unknown target: ${targetId}`);
  const adapter = adapters.get(`${target.provider}-${target.mode}`);
  if (!adapter) throw new Error(`No adapter for ${target.provider}-${target.mode}`);
  return adapter;
}
```

---

## 6. 统一执行入口

### 6.1 `runOperation()` 伪代码

```ts
// web-console/src/lib/ai/run-operation.ts

export async function runOperation(
  operationId: string,
  params: Omit<ExecuteParams, 'targetId' | 'operationId'>,
): Promise<ExecuteResult> {
  // 1. 检查 enabled
  const op = await db.getOperation(operationId);
  if (!op.is_enabled) throw new OperationDisabledError(operationId);

  // 2. 解析 target（继承链）
  const target = await resolveOperationTarget(operationId);
  if (!target) throw new OperationNotConfiguredError(operationId);

  // 3. 预算检查
  await enforceBudget(operationId, target);

  // 4. 获取 adapter 并执行
  const adapter = await getAdapterForTarget(target.id);
  try {
    const result = await adapter.execute({ targetId: target.id, operationId, ...params });
    // 5. 记账（成本、token 分项）
    await recordUsage(operationId, target.id, result.usage, result.costUsd, adapter.mode === 'cli');
    return result;
  } catch (err) {
    // 6. 失败 → 快照 + 抛错
    const snapshot = await createFailureSnapshot(operationId, target.id, params, err);
    throw new OperationFailedError(operationId, err, snapshot.id);
  }
}

// 流式版本供 brainstorm 等聊天场景使用
export async function* runOperationStream(
  operationId: string,
  params: Omit<ExecuteParams, 'targetId' | 'operationId'>,
): AsyncIterable<StreamChunk> {
  /* 类似但返回 AsyncIterable，流结束时统一记账 */
}
```

### 6.2 预算执行

`enforceBudget` 返回一个结构化状态而不是静默返回，这样上层能在 80% 触发 warn banner：

```ts
type BudgetState =
  | { level: 'ok' }
  | { level: 'warn'; pct: number; budget: number }
  | { level: 'soft_block'; pct: number; budget: number }
  | { level: 'hard_block'; pct: number; budget: number };

async function enforceBudget(
  opId: string,
  target: ModelTarget,
  opts: { allowSoftBlockConfirmed?: boolean } = {},
): Promise<BudgetState> {
  const budget = await db.getBudgetConfig();
  if (budget.daily_budget_usd === 0) return { level: 'ok' };  // 无限制

  const todayCost = await db.getTodayCost();
  const pct = (todayCost / budget.daily_budget_usd) * 100;

  if (pct >= budget.hard_block_threshold_pct) {
    throw new BudgetHardBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.soft_block_threshold_pct) {
    if (opts.allowSoftBlockConfirmed) {
      return { level: 'soft_block', pct, budget: budget.daily_budget_usd };
    }
    // UI 层应提前调用 checkBudget(opId) 获得 'soft_block' 状态并弹确认框；
    // 脚本/API 直接调用时会抛异常
    throw new BudgetSoftBlockedError(pct, budget.daily_budget_usd);
  }
  if (pct >= budget.warn_threshold_pct) {
    return { level: 'warn', pct, budget: budget.daily_budget_usd };
  }
  return { level: 'ok' };
}

// 供 UI 层预检用，不抛异常
export async function checkBudget(opId: string): Promise<BudgetState> {
  const target = await resolveOperationTarget(opId);
  if (!target) return { level: 'ok' };
  try {
    return await enforceBudget(opId, target, { allowSoftBlockConfirmed: true });
  } catch (err) {
    if (err instanceof BudgetHardBlockedError) {
      return { level: 'hard_block', pct: err.pct, budget: err.budget };
    }
    throw err;
  }
}
```

上层行为：
- `runOperation` 在调用前不预检，直接 `enforceBudget` 让错误冒泡
- Web UI 在发起操作前先调 `checkBudget`，根据 level 决定是否展示 warn banner / 弹确认框
- 预算状态条通过 `checkBudget` 每 10 秒轮询刷新

### 6.3 失败快照

```ts
async function createFailureSnapshot(
  opId: string,
  targetId: string,
  params: ExecuteParams,
  err: Error,
): Promise<Snapshot> {
  const category = classifyFailure(err);  // 'transient' | 'permanent' | 'unknown'
  const snapshotId = nanoid(12);

  // 1. 写 payload 文件
  const payloadPath = `workspace/snapshots/${snapshotId}.json`;
  await writeFile(payloadPath, JSON.stringify({ opId, targetId, params, errorMessage: err.message }));

  // 2. 条件性 AI 分析（细节 1-C）
  let aiSummary: string | null = null;
  let resumeHint: string | null = null;
  if (category !== 'permanent') {
    try {
      const budget = await db.getBudgetConfig();
      if (budget.fallback_target_id) {
        const analysis = await runAnalysisWithTarget(budget.fallback_target_id, { opId, params, err });
        aiSummary = analysis.summary;
        resumeHint = analysis.hint;
      }
    } catch {
      // 兜底模型也挂了 → 细节 4-A：降级纯代码序列化，不写 AI 字段
    }
  }

  // 3. 插入 DB 元信息
  await db.insertSnapshot({
    id: snapshotId,
    timestamp: new Date().toISOString(),
    operation_id: opId,
    attempted_target_id: targetId,
    failure_category: category,
    failure_message: err.message,
    payload_file_path: payloadPath,
    ai_summary: aiSummary,
    resume_hint: resumeHint,
    status: 'pending',
  });

  return { id: snapshotId, ... };
}
```

### 6.4 恢复流程

```ts
// POST /api/snapshots/:id/resume
export async function resumeSnapshot(id: string): Promise<ExecuteResult> {
  const snap = await db.getSnapshot(id);
  if (snap.status !== 'pending') throw new Error('Snapshot already resolved');

  const payload = JSON.parse(await readFile(snap.payload_file_path, 'utf8'));

  // 注意：不用快照里的 target_id，重新调 runOperation 会查当前配置
  // 用户在恢复前应先修改 Settings（覆盖 target 或加钱等），current config 即为用户的新意图
  const result = await runOperation(snap.operation_id, payload.params);

  await db.updateSnapshot(id, { status: 'resumed', resumed_at: new Date().toISOString() });
  return result;
}
```

**关于多步管线恢复**：本 Feature 只负责**单个 operation 层面**的失败快照与恢复。管线级别（shell 脚本调用多个 operation 的顺序控制）由上层脚本自己处理——脚本在每次调 `runOperation` 失败时捕获错误、将"当前进度指针"写入 `workspace/pipeline-state.yaml`，用户恢复某个 snapshot 后脚本自己读指针继续下一步。这样 Feature 1 专注"单次调用粒度的快照"，不侵入管线状态机。

**Snapshot 弃用**：用户可选择"放弃此快照" → 标记 `status='abandoned'`，从列表消失，payload 文件可选清理（30 天后自动删）。

---

## 7. UI 架构

### 7.1 Settings 页（`/settings`）

#### 整体结构

顶部有 3 个 Tab：**操作配置（主）** / **凭证管理** / **预算与告警**
右上角有 **「⚡ 应用预设」** 按钮

#### Tab 1: 操作配置

按类别分组展示 19 个 operation：

```
▶ 📁 project (1)
    └─ [✓] project.brainstorm
        描述：新项目头脑风暴 — 多轮对话收集需求...
        模型：[Claude Opus 4.6 (API) ▼]   [覆盖] [重置]

▶ 📁 writer (7)   类别默认：[DeepSeek V3.2 (API) ▼]
    ├─ [✓] writer.architect  📌 已覆盖
    │   描述：章节架构师 — 设计章节蓝图...
    │   模型：[Claude Opus 4.6 (API) ▼]   [继承类别]
    ├─ [✓] writer.main
    │   描述：主写手 — 根据架构蓝图产出章节正文...
    │   💡 这是读者直接阅读的文字，质量敏感者推荐 Sonnet 或 Opus
    │   模型：[继承: DeepSeek V3.2] [覆盖]
    └─ ...
```

**交互**：
- 类别头可折叠
- 类别默认下拉：设置后所有未覆盖的子 operation 实时生效
- 已覆盖的 operation 旁显示 📌 + "继承类别"按钮
- `is_enabled` toggle 就在卡片最左侧
- 模型下拉菜单中，不可用的 target 灰色 + tooltip 说明原因

#### Tab 2: 凭证管理

分两段：

**🌐 API 凭证** — 每个 provider 一个卡片：
- 显示 API Key（默认隐藏）
- "测试" 按钮：发一个 ping 请求验证连通
- 保存后触发 target 可用性重检测

**💻 CLI 检测** — 每个 CLI 一个卡片：
- 显示检测状态（✓/✗）、版本、路径、订阅状态
- "重新检测" 按钮手动刷新

#### Tab 3: 预算与告警

- 每日预算上限（USD 输入框，`0` = 无限制）
- 三级阈值调整（预警/软阻/硬阻）
- 快照兜底模型下拉

### 7.2 预设菜单（`⚡ 应用预设`）

点击右上角按钮弹出 Modal，展示 **6 个预设卡片**：

| 预设 | 渠道数 | 预估 100 章成本 | 适合 | 前置条件 |
|------|--------|---------------|------|----------|
| 🎯 **平衡（API）** | 2 | ~$38 | 国际题材/中英混合 | Anthropic + DeepSeek API Key |
| 📖 **中文优化** | 2 | ~$15 | 中文网文（非敏感题材） | Anthropic + Alibaba Qwen Key |
| 💰 **极致性价比** | 1 | ~$3 | 预算紧 / 量产 | DeepSeek API Key |
| 🏆 **榜首性能** | 3 | ~$45 | 质量至上 | Anthropic + Google + DeepSeek API Key |
| 🎟 **纯订阅党** | 1 | $0 边际 | 有 Claude Max 订阅 | Claude Max + 本机 claude CLI |
| 🔀 **订阅+API 混合** | 2 | ~$3 | 订阅党想省 API 钱 | Claude 订阅 + DeepSeek API Key |

#### 各预设的具体绑定

**🎯 平衡（API）**：
- 指挥层（`project.brainstorm`, `outline.volume.plan`, `showrunner.decide`, `writer.architect`）→ Claude Opus 4.6
- 质量门（`writer.main`, `writer.final_revise`, `critic.review`, `lore.*`, `outline.chapter.plan`）→ Claude Sonnet 4.6
- 执行层（其余）→ DeepSeek V3.2

**📖 中文优化**：
- 指挥层 → Claude Opus 4.6（仍然用 Opus，因为它中文推理也不弱）
- 质量门（特别是 `writer.main`, `writer.final_revise`）→ Alibaba Qwen3-Max（中文文学表达最强之一）
- 执行层 → Alibaba Qwen3.5-Flash（$0.029/$0.286，比 DeepSeek 更便宜且中文优）
- `lore.style.generate` → Alibaba Qwen3-Max（语言风格定义对中文理解敏感）

**💰 极致性价比**：全部 19 个 operation → DeepSeek V3.2

**🏆 榜首性能**：
- 指挥层 → Gemini 3.1 Pro Preview（2026-04 榜首）
- 质量门 → Claude Sonnet 4.6
- 执行层 → DeepSeek V3.2

**🎟 纯订阅党**：
- 指挥层 → Claude Opus 4.6 (CLI)
- 质量门 → Claude Sonnet 4.6 (CLI)
- 执行层 → Claude Haiku 4.5 (CLI)

**🔀 订阅+API 混合**：
- 指挥层 → Claude Opus 4.6 (CLI)
- 质量门 → Claude Sonnet 4.6 (CLI)
- 执行层 → DeepSeek V3.2 (API)

点击预设卡片 → 展开"影响哪些 operation" 详情 → "应用到当前配置" → 批量写入 `operation_category_defaults` 和 `operation_overrides`

### 7.3 Usage 页（`/usage` — 新建）

从上到下依次：

1. **总览卡片**（4 个）— 今日/本周/本月/累计成本 + "CLI 节省"指标
2. **预算状态条**（彩色渐变） — 显示当前百分比和三个阈值标记
3. **按操作拆分**（可切换分组维度：按 operation / 按 model / 按 category）
4. **时间序列折线图**（成本/tokens/调用数三选一）
5. **每 operation 估价参考表**（"写一整章约 $X" 的直观表达）
6. **失败与快照列表** — 可点击"恢复"跳转

---

## 8. Agent 启动时的可用性扫描

Remote Agent 启动后（或通过 Web UI 触发"重新检测"），对所有 `model_targets` 执行：

```ts
for (const target of allTargets) {
  const adapter = await getAdapterForTarget(target.id);
  const { available, reason } = await adapter.detectAvailability();
  await db.updateTargetAvailability(target.id, available, reason);
}
```

**API 模式检测**：查询 `config` 表对应 API Key 是否存在且非空；可选：发一次 `GET /v1/models` 类探活
**CLI 模式检测**：`spawn(cliCmd, ['--version'])` 测试退出码为 0

扫描结果写入 `model_targets.available` 和 `availability_reason`，Settings 页下拉菜单据此灰化。

---

## 9. 迁移策略

### 9.1 `agents.yaml` 转换

**之前**：
```yaml
roles:
  architect:
    prompt_file: prompts/writers/architect.md
    model: claude-sonnet-4-6      # 被忽略的字段
```

**之后**：
```yaml
roles:
  architect:
    prompt_file: prompts/writers/architect.md
    operation_id: writer.architect   # 指向 ai_operations 表
```

### 9.2 迁移脚本

`scripts/migrate-to-operations.ts`（新）：
1. 备份 `config/agents.yaml` → `config/agents.yaml.bak`
2. 遍历 roles，根据名称映射到 operation_id
3. 将原 `model` 字段的值作为 initial override 写入 `operation_overrides`
4. 重写 `agents.yaml`，用 `operation_id` 替换 `model`

### 9.3 Shell 脚本改造

`scripts/writers-room.sh` 等脚本当前直接 `spawn` CLI。改造后通过 Web API 走统一入口：

```bash
curl -sS -X POST "http://localhost:3000/api/operation/run" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg op "$OPERATION_ID" \
    --arg sys "$(cat $PROMPT_FILE)" \
    '{operation_id: $op, system_prompt: $sys, messages: [{"role":"user","content":""}]}')"
```

新增 API 路由：`POST /api/operation/run` — 接收 operation_id + params，内部调 `runOperation()` 返回结果。

### 9.4 数据库迁移

`web-console/src/lib/db/migrations/002_ai_operations.sql`：
1. `CREATE TABLE` 六张新表
2. `ALTER TABLE token_usage` 扩展字段
3. Seed model_targets（~15 rows）
4. Seed ai_operations（19 rows）
5. Seed budget_config 默认行

---

## 10. 测试策略

### 10.1 单元测试

| 模块 | 测试内容 |
|------|---------|
| `resolveOperationTarget()` | 覆盖 / 继承 / 未配置 3 种情况 |
| 每个 Adapter | mock HTTP / mock spawn，验证请求构造、usage 解析、成本计算 |
| `enforceBudget()` | 预算 0 / 未达 / 80% / 100% / 120% 5 个分支 |
| `createFailureSnapshot()` | transient / permanent / unknown 3 种分类 + 文件写入 |
| 成本公式 | 每个 model_target 定价计算正确 |

### 10.2 集成测试

| 场景 | 步骤 |
|------|------|
| 完整操作流水 | `runOperation` → DB 记账 → Usage 页显示 |
| 预算阻断 | 设 budget=0.01 → 触发操作 → 收到 `BudgetHardBlockedError` |
| 快照 → 恢复 | Mock adapter 抛 429 → 快照落盘 → 修改配置 → 恢复 → 成功 |
| CLI 模式 token | Mock spawn 返回已知 stream-json → 解析 usage 正确 |
| 预设应用 | 应用"极致性价比" → 验证 19 个 operation 全部绑定到 DeepSeek V3.2 |

### 10.3 E2E 测试

1. **首次启动**：DB 空 → seed 完成 → Settings 页显示 19 个未配置 operation
2. **配置 API Key**：填入 DeepSeek Key → target 可用性从"未配置"变"✓"
3. **应用预设**：应用"极致性价比" → 所有 operation 绑定到 DeepSeek V3.2 API
4. **手动触发**：执行 `writer.architect` → 看到成本记账
5. **预算超限**：设 $0.001 上限 → 再跑 → 硬阻 → 调高 → 成功
6. **模拟失败**：断网 → 跑 operation → 快照创建 → 恢复网络 → 点恢复 → 成功

---

## 11. 开发任务拆分

### Phase 1.A：基础设施（串行）
1. 数据库迁移脚本 + seed 数据
2. 共享类型定义（`lib/ai-providers/types.ts`）
3. `db/queries.ts` 扩展（operation / target / budget / snapshot）
4. `resolveOperationTarget()` + 测试
5. `enforceBudget()` + 测试

### Phase 1.B：Provider 适配器（可并行）
6. `AnthropicAPIAdapter`
7. `OpenAICompatibleAdapter`（基类，覆盖 OpenAI / DeepSeek / Qwen / Zhipu / Moonshot，通过 baseURL 区分）
8. `GeminiAPIAdapter`
9. `ClaudeCLIAdapter`（依赖 Remote Agent 协作）
10. `GeminiCLIAdapter`

### Phase 1.C：统一执行入口（串行）
11. `runOperation()` + `runOperationStream()`
12. `createFailureSnapshot()` + `resume()`
13. `POST /api/operation/run` 路由
14. `POST /api/snapshots/:id/resume` 路由
15. `checkBudget()` UI 预检 API

### Phase 1.D：UI 改造（可并行 — 3 个不同页面）
16. Settings 页重写（3 个 Tab + 预设菜单）
17. `/usage` 页新建
18. Remote Agent 启动时的 target 可用性扫描

### Phase 1.E：迁移与收尾（串行）
19. `agents.yaml` 迁移脚本
20. `writers-room.sh` 等 Shell 脚本改造
21. 6 个预设定义与"应用预设"交互
22. 集成测试 + E2E 验证
23. 更新 `docs/STATUS.md`（勾选 Feature 1 完成状态）

---

## 12. 验收标准

- [ ] 19 个 operation 的默认绑定可从 Settings 修改，继承链正确工作
- [ ] 7 个 Provider 适配器全部实现，API 模式和 CLI 模式均能运行
- [ ] 用 DeepSeek API Key 跑通一个完整写作任务
- [ ] 用 Claude CLI 跑通同一个任务（CLI 模式 token 记账正确）
- [ ] `/usage` 页显示成本（与实际 API 账单误差 < 5%）
- [ ] 预算告警能在 CLI 和 Web 两端生效
- [ ] 模拟失败 → 快照 → 恢复流程能跑通
- [ ] 5 个预设能一键应用
- [ ] `agents.yaml` 迁移脚本跑完后，原管线能继续工作

---

## 13. 已知限制与后续扩展

- **rate limit 执行** 暂不实现（配置中已有 `rate_limit_rpm` 字段，本 Feature 不处理）
- **多并发调度** 暂不做（沿用现有 `MAX_CONCURRENT_CLAUDE` 环境变量）
- **模型能力声明**（tool use / vision / long context）暂不建模，需要时再扩展
- **按 provider/category 细分预算** 暂不支持，MVP 只做全局单预算

这些项会在 Feature 1 完成后根据实际使用情况决定是否在 Feature 4+ 中补齐。

---

## 14. 参考资料

- **[LLM-Price 仓库](https://github.com/syaoranwe/LLM-Price)** — 本 spec 定价表的主要来源
- [Best AI Models April 2026](https://www.buildfastwithai.com/blogs/best-ai-models-april-2026)
- [Claude API Pricing Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [Gemini API Pricing 2026](https://www.tldl.io/resources/google-gemini-api-pricing)
- [Alibaba Qwen DashScope](https://dashscope.aliyuncs.com/)
- [Zhipu BigModel](https://open.bigmodel.cn/)
- [Moonshot Kimi](https://platform.moonshot.cn/)
- [NovelForge STATUS.md](../../STATUS.md)
- [NovelForge ROADMAP.md](../../ROADMAP.md)
