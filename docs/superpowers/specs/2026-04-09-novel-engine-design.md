# AI 小说工程化写作系统设计

> 编剧室 + 制片人模式（Writers' Room + Showrunner）

## 1. 项目概述

### 1.1 目标

构建一套工程化的 AI 自动小说生成系统，能够：

- 全自动生成百万字级网文长篇小说
- 通过多 Agent 协作（编剧室模式）释放 AI 创作潜力
- 自动维护完整的资料文档体系，确保长篇一致性
- 支持检查点式人类审阅，在关键节点把控方向
- 合理管控 token 消耗

### 1.2 核心架构：三层结构

```
第一层：制片人（Showrunner）— 总控管线，把控方向与节奏
第二层：编剧室（Writers' Room）— 多角色 Agent 协作完成每个创作单元
第三层：资料中台（Lore Engine）— 分层记忆系统，按需供给上下文
```

### 1.3 技术栈与模型分配

| 工具 | 角色 |
|------|------|
| Claude Code / Claude API | 制片人总控 + 正文生成 + 核心创意角色 |
| Gemini CLI | 连续性审查、大范围资料检索（长上下文优势）、章节摘要生成 |
| OpenCode (Go) | 轻量任务编排、文件操作、资料文档格式化维护 |

---

## 2. 工程目录结构

```
paperProject/
├── CLAUDE.md                     # 项目级 Agent 规则
├── config/
│   ├── project.yaml              # 项目元信息（书名、类型、目标字数、风格等）
│   ├── agents.yaml               # 编剧室角色定义与 prompt 模板配置
│   ├── pipeline.yaml             # 管线阶段配置、检查点策略、容错策略
│   └── models.yaml               # 模型分配策略（Claude/Gemini/OpenCode 各负责什么）
│
├── lore/                         # 资料中台（Lore Engine）
│   ├── world/                    # 世界观设定
│   │   ├── core-rules.md         # 核心规则（魔法体系/科技体系等）
│   │   ├── geography.md          # 地理
│   │   ├── history.md            # 历史
│   │   ├── factions.md           # 势力
│   │   └── glossary.md           # 用语词典
│   ├── characters/               # 角色档案
│   │   ├── _index.md             # 角色总览与关系图
│   │   ├── protagonist-01.md     # 主角档案
│   │   └── ...
│   ├── style/                    # 风格指南
│   │   ├── voice.md              # 叙事语气、人称、文风
│   │   ├── dialogue-rules.md     # 对话风格规范
│   │   └── taboos.md             # 禁忌/避免的写法
│   └── _context/                 # 自动生成的上下文层（AI 维护，人工不编辑）
│       ├── L0-global-summary.md  # 全局摘要（始终加载）
│       ├── L1-vol-{n}.md         # 各卷上下文摘要
│       └── L2-recent.md          # 最近章节滚动摘要
│
├── outline/                      # 情节规划
│   ├── master-outline.md         # 总大纲（全书主线、主要转折）
│   ├── vol-{n}/                  # 分卷大纲
│   │   ├── vol-outline.md        # 本卷大纲
│   │   └── chapter-briefs.md     # 本卷各章简要规划
│   └── threads/                  # 故事线追踪
│       ├── main-plot.md          # 主线追踪
│       ├── subplot-{name}.md     # 支线追踪
│       └── foreshadow.md         # 伏笔登记簿（埋设/回收状态）
│
├── manuscript/                   # 成稿
│   ├── vol-01/
│   │   ├── ch-001.md             # 第1章正文
│   │   ├── ch-001.meta.yaml      # 章节元数据
│   │   └── ...
│   └── ...
│
├── workspace/                    # 编剧室工作区（过程文件）
│   ├── current/                  # 当前章节的工作文件
│   │   ├── chapter-brief.md      # 制片人下发的章节任务书
│   │   ├── structure-draft.md    # 架构师的结构稿
│   │   ├── draft-v1.md           # 初稿
│   │   ├── draft-v2.md           # 二稿（合并审查意见后）
│   │   ├── review-notes.md       # 批评家/审查员的意见
│   │   ├── draft-final.md        # 终稿
│   │   └── decision.yaml         # 制片人当轮决策
│   ├── archive/                  # 历史工作文件归档
│   └── pipeline-state.yaml       # 管线状态（断点恢复用）
│
├── checkpoints/                  # 人类审阅检查点
│   ├── cp-vol01-ch010.md         # 检查点报告
│   └── ...
│
├── scripts/                      # 编排脚本
│   ├── init-project.sh           # 项目初始化
│   ├── showrunner.sh             # 制片人主循环入口
│   ├── writers-room.sh           # 编剧室会议编排
│   ├── lore-update.sh            # 资料更新触发
│   ├── checkpoint.sh             # 检查点生成
│   ├── volume-wrap.sh            # 卷收尾
│   ├── revise-outline.sh         # 大纲修订
│   └── status.sh                 # 状态查看
│
├── prompts/                      # Prompt 模板库
│   ├── showrunner/               # 制片人各阶段 prompt
│   │   ├── decide.md             # 决策 prompt
│   │   ├── create-brief.md       # 生成章节任务书 prompt
│   │   └── update-state.md       # 更新状态 prompt
│   ├── writers/                  # 各编剧角色 prompt
│   │   ├── architect.md          # 故事架构师
│   │   ├── main-writer.md        # 主笔
│   │   ├── main-writer-alt.md    # 主笔（竞稿备选风格）
│   │   ├── character-advocate.md # 角色代言人
│   │   ├── atmosphere.md         # 氛围渲染师
│   │   ├── revise.md             # 修订合并
│   │   ├── merge-best.md         # 竞稿选优合并
│   │   └── final-revise.md       # 终稿修订
│   ├── lore/                     # 资料维护 prompt
│   │   ├── update-character.md   # 角色状态更新
│   │   ├── update-foreshadow.md  # 伏笔登记更新
│   │   ├── generate-summary.md   # 章节摘要生成
│   │   └── refresh-context.md    # 上下文层刷新
│   └── review/                   # 审查类 prompt
│       ├── critic.md             # 批评家/读者
│       ├── continuity.md         # 连续性审查
│       └── blind-compare.md      # 竞稿盲评
│
└── docs/                         # 项目文档
    └── superpowers/
        └── specs/
```

### 设计决策说明

1. **lore/ 和 outline/ 分离** — 静态设定（世界观）与动态规划（情节）职责不同，更新频率不同
2. **`_context/` 自动生成层** — AI 维护的摘要层，是四级上下文金字塔 L0-L2 的物理存储，人工不编辑
3. **`workspace/current/`** — 编剧室的"会议桌"，每章完成后归档到 `archive/` 并清空
4. **`ch-xxx.meta.yaml`** — 每章的结构化元数据，支持机器检索（如"找出所有张三出场的章节"）
5. **prompts/ 与 config/ 分离** — prompt 模板可独立迭代优化，不影响运行配置

---

## 3. 编剧室（Writers' Room）协作机制

### 3.1 角色定义

| 角色 | 职责 | 何时参与 | 推荐模型 |
|------|------|----------|---------|
| 故事架构师 | 设计章节结构、场景划分、节奏曲线、转折点 | 每章必参与 | Claude Opus |
| 主笔 | 按结构稿撰写完整正文 | 每章必参与 | Claude Opus/Sonnet |
| 角色代言人 | 以特定角色视角审视行为/对话是否符合人设 | 涉及关键角色时 | Claude Sonnet |
| 氛围渲染师 | 审视环境描写、情感基调、文风一致性 | 重点/高潮章节 | Claude Sonnet |
| 伏笔编织者 | 追踪和编织伏笔、暗线、前后呼应 | 伏笔操作章节 | Claude Sonnet |
| 批评家/读者 | 以读者视角评估趣味性、节奏、可读性 | 初稿完成后 | Gemini |
| 连续性审查员 | 检查与已有内容的事实一致性 | 终稿前 | Gemini |

### 3.2 协作流程

```
制片人下发章节任务书（chapter-brief）
        │
        ▼
  故事架构师 → 输出：章节结构稿（场景划分、节奏曲线、转折点）
        │
        ▼
  正文创作组（可并行）
  ├─ 主笔：按结构稿写完整初稿
  ├─ 角色代言人：审视角色行为/对话，提供修改建议
  └─ 氛围渲染师：审视环境描写/情感基调，提供修改建议
        │
        ▼（合并修改建议，主笔修订为二稿）
        │
        ▼
  审查组（可并行）
  ├─ 批评家/读者：趣味性、节奏、可读性评估
  └─ 连续性审查员：事实一致性检查
        │
        ▼（根据审查意见修订为终稿）
        │
        ▼
  资料更新组
  ├─ 摘要生成：本章摘要 + meta.yaml
  ├─ 角色状态更新：修改涉及角色的 AUTO_MAINTAINED 区域
  ├─ 伏笔登记：更新 foreshadow.md
  └─ 上下文层刷新：更新 L0/L1/L2
```

### 3.3 动态调度策略

制片人根据章节类型决定编剧室配置：

| 章节类型 | 参与角色 | 预估 token 消耗 |
|---------|---------|----------------|
| 日常/过渡 | 架构师 + 主笔 + 摘要更新 | ~15K |
| 剧情推进 | 架构师 + 主笔 + 角色代言人 + 批评家 + 全量资料更新 | ~40K |
| 高潮/转折 | 全编剧室 + 竞稿模式（2份初稿选优） + 全量审查 | ~70K |
| 伏笔收束 | 架构师 + 主笔 + 伏笔编织者 + 连续性审查员 + 全量资料更新 | ~50K |

制片人通过章节任务书中的 `chapter_type` 字段自动决定调度方案。

### 3.4 竞稿模式（关键章节专用）

1. 两个主笔 Agent 基于相同结构稿**并行**写两版初稿
2. 批评家 Agent 对两版进行盲评打分（情节张力、角色表现、文笔、节奏）
3. 选优胜稿，但可从落选稿中提取优秀片段合并
4. 合并稿进入正常审查流程

### 3.5 Agent 间通信规范

Agent 之间不直接对话，全部通过 `workspace/current/` 下的文件交换信息。

章节任务书格式示例：

```yaml
# workspace/current/chapter-brief.md
chapter_number: 42
chapter_type: climax        # daily | plot_advance | climax | foreshadow_resolve
volume: 3
title_suggestion: "暗流涌动"
key_events:
  - 主角发现师父的真实身份
  - 第一次正面对抗反派
characters_involved: [protagonist-01, master-01, villain-a]
foreshadow_actions:
  - resolve: "fs-012: 第12章埋设的玉佩伏笔"
  - plant: "fs-031: 为第5卷的叛变埋线"
tone: 紧张、震撼、情感冲击
constraints:
  - 字数目标：4000-5000字
  - 师父不能在本章死亡（留到第45章）
context_load:
  fixed: [L0, L1-vol-3, L2-recent]
  characters: [protagonist-01, master-01, villain-a]
  extra: []
```

---

## 4. 资料中台（Lore Engine）

### 4.1 资料文档格式规范

所有 lore 文档采用统一的 frontmatter 结构：

```markdown
---
type: character          # world | character | style | plot-thread | foreshadow
id: char-protagonist-01
name: 李逸尘
tags: [主角, 剑修, 第一卷, 活跃]
last_updated_chapter: 42
priority: critical       # critical | major | minor | background
---

## 基本信息
姓名：李逸尘
年龄：18（开篇）
身份：青云门外门弟子

## 当前状态（AI 自动维护区）
<!-- AUTO_MAINTAINED_START -->
当前位置：青云山
修为境界：筑基中期
情感状态：震怒（刚发现师父真实身份）
持有物品：残剑、玉佩（已激活）
最近关键事件：第42章与反派A首次正面冲突
活跃关系变化：与师父关系破裂
<!-- AUTO_MAINTAINED_END -->

## 性格与行为准则（人工设定区）
- 面对不公时会第一个站出来，哪怕对手远强于自己
- 不会主动杀人，但保护同伴时可以下死手
- 说话直来直去，不会拐弯抹角
- 独处时会自我怀疑，但不会在人前表露

## 对话风格
- 短句为主，少用修辞
- 口头禅："这有什么好犹豫的"
- 愤怒时反而会变得很安静

## 角色弧线（人工设定区）
- 第1卷：天真少年 → 初识江湖险恶
- 第2卷：成长与磨砺
- 第3卷：信任崩塌 → 独立思考
- ...
```

**关键设计：人工设定区与 AI 维护区通过 `AUTO_MAINTAINED` 标记明确分离。** AI 只更新标记范围内的内容，绝不覆盖人工设定。

### 4.2 四级上下文金字塔

```
         ┌──────────────┐
    L0   │ 全局摘要      │  ~2K tokens  始终加载
         │ 核心规则+主线  │
         ├──────────────┤
    L1   │ 卷级上下文    │  ~5K tokens  当前卷加载
         │ 卷大纲+角色弧  │
         ├──────────────┤
    L2   │ 近章滚动窗口   │  ~3-8K tokens  最近N章摘要
         │ 渐进遗忘机制   │
         ├──────────────┤
    L3   │ 详细资料库     │  按需检索 ~1-5K tokens
         │ 全量档案+历史  │
         └──────────────┘
```

#### L0 — 全局摘要（`_context/L0-global-summary.md`）

每章结束后自动重新生成，严格控制在 2K tokens 内。包含：

- 世界核心规则（不可违反的根本法则）
- 主线进度（一句话描述当前阶段）
- 主要角色当前状态（一行一个）
- 活跃伏笔 TOP 5

#### L1 — 卷级上下文（`_context/L1-vol-{n}.md`）

每卷开始时生成，每章结束后增量更新。包含：

- 本卷主题与核心冲突
- 本卷大纲摘要（简化版）
- 本卷角色弧线进度
- 本卷活跃支线
- 本卷伏笔操作记录

#### L2 — 近章滚动窗口（`_context/L2-recent.md`）

渐进遗忘机制：越近的章节摘要越详细，越远越压缩。

| 距离 | 摘要粒度 | 约 Tokens |
|------|---------|-----------|
| 最近1章 | 详细（场景、对话要点、情感转变） | ~800 |
| 前2-3章 | 中等（关键事件、角色互动） | ~400/章 |
| 前4-5章 | 简略（一段话概括） | ~200/章 |
| 前6-10章 | 极简（一两句话） | ~100/章 |
| 更远 | 索引（章节号+关键词） | ~50/章 |

每章结束后整体右移，L2 始终控制在 3-8K tokens。

#### L3 — 详细资料库

不主动加载，由制片人在章节任务书的 `context_load` 字段指定：

- ID 精确加载：`characters: [protagonist-01, master-01]`
- 标签检索：`tags: [第一卷, 剑修]`
- 全文回溯：`chapters: [ch-012]`（需要引用原文时）

### 4.3 资料更新流水线

每章终稿确认后自动触发：

```
终稿确认
  │
  ├─ 1. 生成 ch-xxx.meta.yaml（结构化元数据）
  │     出场角色列表、伏笔操作、场景地点、关键事件摘要、字数统计
  │
  ├─ 2. 更新角色档案（并行）
  │     扫描 meta.yaml 中的出场角色
  │     更新各角色的 AUTO_MAINTAINED 区域
  │
  ├─ 3. 更新伏笔登记簿
  │     新埋设 → planted，已回收 → resolved
  │
  ├─ 4. 刷新上下文层（串行，L2 → L1 → L0）
  │     L2：滚动窗口右移，生成新章摘要，压缩远章
  │     L1：增量更新本卷上下文
  │     L0：重新生成全局摘要
  │
  └─ 5. 一致性校验
        比对本章内容与角色档案
        检查是否遗漏了任务书要求的伏笔操作
        有矛盾则标记 warning 到 pipeline-state.yaml
```

---

## 5. 制片人管线（Showrunner Pipeline）

### 5.1 制片人主循环

```
  ┌─────────────────────────────────┐
  │  读取当前状态                     │
  │  (pipeline-state.yaml + L0)     │
  └──────────┬──────────────────────┘
             │
             ▼
  ┌─────────────────────────────────┐
  │  决策：下一步做什么？              │
  │  A) 继续写下一章                  │
  │  B) 需要先修订大纲（故事偏离）     │
  │  C) 需要回修前面章节（发现矛盾）   │
  │  D) 到达检查点，暂停等人类审阅     │
  │  E) 本卷完结，收尾并规划下卷       │
  └──────────┬──────────────────────┘
             │
             ▼
  ┌─────────────────────────────────┐
  │  生成章节任务书 / 修订任务         │
  │  指定编剧室配置与上下文加载清单     │
  └──────────┬──────────────────────┘
             │
             ▼
  ┌─────────────────────────────────┐
  │  启动编剧室 / 执行修订            │
  └──────────┬──────────────────────┘
             │
             ▼
  ┌─────────────────────────────────┐
  │  验收结果 → 触发资料更新          │
  │  记录决策日志 → 更新管线状态       │
  └──────────┬──────────────────────┘
             │
             └──→ 回到循环顶部
```

### 5.2 自适应决策机制

制片人每轮评估的状态信号：

```yaml
signals:
  plot_deviation:        # 实际情节与大纲的偏离程度（low/medium/high）
  consistency_warnings:  # 上一章一致性校验的 warning 数量
  pacing_score:          # 最近3章的节奏评分
  foreshadow_debt:       # 未回收伏笔中即将到期的数量
  word_count_progress:   # 本卷已完成字数 vs 目标字数
  checkpoint_due:        # 是否到达检查点
```

决策规则：

| 信号组合 | 决策 |
|---------|------|
| `checkpoint_due = true` | 暂停，生成检查点报告 |
| `consistency_warnings >= 3` | 暂停推进，先修复矛盾 |
| `plot_deviation = high` | 召集架构师修订后续大纲 |
| `pacing_score` 连续3章低于阈值 | 下一章强制切换节奏 |
| `foreshadow_debt` 有到期伏笔 | 下一章任务书中强制要求回收 |
| 一切正常 | 按序推进下一章 |

### 5.3 检查点机制

触发条件（满足任一）：

- 每卷结束
- 每 N 章（默认 N=10，可在 pipeline.yaml 中配置）
- 制片人判断出现重大偏离
- 累计 consistency_warnings 超过阈值

检查点报告内容：

```markdown
# 检查点报告

## 进度概览
已完成章节数、字数、token 消耗

## 故事状态
主线进度、与原大纲的偏离点、未回收伏笔

## 质量指标
平均节奏评分、一致性 warning 统计、竞稿启用情况

## 需要人类决策的问题
列出需要人类判断的偏离点或分歧

## 下一阶段预览
后续章节的计划概览
```

人类审阅后可以：通过 / 给出修改指令 / 要求从指定章节回滚重新生成。

### 5.4 卷级生命周期

```
卷初始化
  ├─ 基于总大纲生成本卷详细大纲
  ├─ 生成本卷章节规划
  ├─ 初始化 L1 卷级上下文
  └─ 确定本卷检查点间隔和编剧室默认配置

章节循环（制片人主循环）

卷收尾
  ├─ 生成卷总结报告
  ├─ 归档本卷工作文件
  ├─ 压缩本卷所有章节摘要为卷级摘要
  ├─ 更新总大纲中的实际完成情况
  └─ 触发检查点，等待人类审阅后初始化下卷
```

### 5.5 容错与恢复

```yaml
# pipeline.yaml
recovery:
  chapter_retry: 2                     # 章节生成失败最多重试2次
  chapter_fallback: simplify           # 重试仍失败则降级为轻量编剧室
  lore_update_retry: 3                 # 资料更新失败最多重试3次
  lore_update_fallback: skip_and_flag  # 跳过但标记，下轮补更新
  critical_conflict: pause             # 严重矛盾暂停管线，等人类决策
  state_file: workspace/pipeline-state.yaml  # 每步写入，支持断点恢复
```

### 5.6 状态持久化

```yaml
# workspace/pipeline-state.yaml
project: 仙道逆天
current_volume: 3
current_chapter: 42
total_chapters_written: 42
total_words: 189000

last_action: write_chapter
last_action_status: success
last_action_timestamp: 2026-04-09T15:30:00Z

signals:
  plot_deviation: low
  consistency_warnings: 0
  pacing_scores: [7, 8, 7]
  foreshadow_debt:
    - id: fs-012
      description: 玉佩伏笔
      planted_at: ch-012
      expected_resolve: vol-3
  checkpoint_due: false
  next_checkpoint: ch-050

token_usage:
  this_session: 380000
  total: 1520000
```

---

## 6. 执行编排

### 6.1 脚本入口

```bash
# 初始化新项目
bash scripts/init-project.sh

# 启动/恢复写作
bash scripts/showrunner.sh
bash scripts/showrunner.sh --resume

# 从指定章节重新生成
bash scripts/showrunner.sh --from ch-042

# 单独重跑某章的编剧室
bash scripts/writers-room.sh --chapter 42

# 手动触发资料更新
bash scripts/lore-update.sh --chapter 42

# 查看当前状态
bash scripts/status.sh
```

### 6.2 编剧室脚本核心流程

```bash
# writers-room.sh 简化逻辑

# 1. 故事架构师（必选）
claude --print --prompt-file prompts/writers/architect.md \
    --context chapter-brief + L0 + L1 \
    > workspace/current/structure-draft.md

# 2. 主笔初稿
claude --print --prompt-file prompts/writers/main-writer.md \
    --context structure-draft + L2 + 相关角色档案(L3) \
    > workspace/current/draft-v1.md

# 3. 角色代言人审查（按需，可并行）
for char_id in characters_involved; do
    claude --print --prompt-file prompts/writers/character-advocate.md \
        --context 角色档案 + draft-v1 \
        > workspace/current/review-${char_id}.md &
done
wait

# 4. 合并修改建议，修订为二稿
claude --print --prompt-file prompts/writers/revise.md \
    --context draft-v1 + review-*.md \
    > workspace/current/draft-v2.md

# 5. 批评家审查（Gemini，按需）
gemini --prompt-file prompts/review/critic.md \
    --context draft-v2 + L2 \
    > workspace/current/critic-review.md

# 6. 连续性审查（Gemini）
gemini --prompt-file prompts/review/continuity.md \
    --context draft-v2 + 全量上下文层 \
    > workspace/current/continuity-check.md

# 7. 终稿修订
claude --print --prompt-file prompts/writers/final-revise.md \
    --context draft-v2 + 审查意见 \
    > workspace/current/draft-final.md

# 8. 归档
cp workspace/current/draft-final.md manuscript/vol-XX/ch-XXX.md
```

### 6.3 竞稿模式

高潮章节启用：

```bash
# 两个主笔并行
claude ... > workspace/current/draft-A.md &
claude ... > workspace/current/draft-B.md &
wait

# Gemini 盲评
gemini --prompt-file prompts/review/blind-compare.md \
    --context draft-A + draft-B \
    > workspace/current/compare-result.md

# 选优合并
claude --prompt-file prompts/writers/merge-best.md \
    --context compare-result + draft-A + draft-B \
    > workspace/current/draft-v1.md
```

---

## 7. 初始化流程

### 阶段一：人工准备（必须）

1. 运行 `init-project.sh` 生成目录骨架和模板文件
2. 填写 `config/project.yaml`（书名、类型、目标字数、分卷规划、风格定位）
3. 填写核心世界观（`lore/world/`，至少完成 `core-rules.md`）
4. 填写主要角色档案（`lore/characters/`，至少主角和前期核心角色 3-5 个）
5. 填写风格指南（`lore/style/`，至少完成 `voice.md`）
6. 填写总大纲（`outline/master-outline.md`）

### 阶段二：AI 预热（自动）

7. AI 基于总大纲生成第一卷详细大纲
8. AI 初始化上下文层（L0 全局摘要、L1 第一卷上下文）
9. AI 补全资料文档（根据第一卷大纲自动生成需要的次要角色档案、补充世界观细节）
10. 生成预览检查点，供人类确认

### 阶段三：人类确认后启动管线

---

## 8. 最佳实践

### 8.1 大纲设计原则

好的大纲应该包含：
- 每卷的核心冲突和情感弧线（不只是事件列表）
- 主要转折点的具体描述（不是"发生了一件大事"）
- 角色在每卷的成长方向
- 伏笔的预埋和回收规划（哪卷埋、哪卷收）

但不应该：
- 规定每章的具体内容（留给 AI 发挥空间）
- 写死所有细节（合理范围内的创造性偏离是好事）

### 8.2 角色档案编写原则

写"行为准则"而非"性格标签"：

```
# 差：勇敢、正义、善良
# 好：面对不公时会第一个站出来，哪怕对手远强于自己
```

写"具体对话风格"而非"话多/话少"：

```
# 差：性格开朗，话多
# 好：口头禅"这有什么好犹豫的"，愤怒时反而变安静
```

### 8.3 检查点审阅指南

优先关注：
- 主线是否偏离太远
- 角色行为是否符合人设
- 节奏是否合理
- 伏笔管理是否健康

不必纠结：
- 个别措辞
- 单章内的小逻辑问题（连续性审查员会处理）

### 8.4 Token 成本管理

| 策略 | 说明 | 预估节省 |
|------|------|---------|
| 章节类型分级调度 | 日常章只用轻量编剧室 | ~40% 常规章节 |
| L3 按需加载 | 不载入无关角色档案 | ~20% 上下文 |
| Gemini 承担审查 | 长上下文任务交给 Gemini | ~15% 审查环节 |
| L2 渐进遗忘 | 远章高度压缩 | 避免上下文膨胀 |
| 批量资料更新 | 多角色状态更新合并为一次调用 | ~30% 资料更新 |

### 8.5 全书成本预估（100万字，约250章）

```
普通章节：~200章 × 40K tokens  = 8M tokens
重点章节：~40章 × 60K tokens   = 2.4M tokens
高潮章节：~10章 × 80K tokens   = 0.8M tokens
资料更新：~250章 × 10K tokens  = 2.5M tokens
制片人决策：~250次 × 5K tokens = 1.25M tokens
检查点报告：~25次 × 15K tokens = 0.375M tokens
大纲修订：~10次 × 20K tokens   = 0.2M tokens
──────────────────────────────────
总计约：15.5M tokens（输入+输出混合）
```

### 8.6 迭代优化建议

- **第一卷（保守运行）**：全量编剧室跑前5章，观察质量，调优 prompt 模板
- **第二卷（建立节奏）**：开始使用动态调度，日常章走轻量流程
- **第三卷及以后（稳态运行）**：prompt 基本稳定，关注伏笔管理和长线一致性
