# 小说项目初始化模块 — 开发计划

## 背景

当前 NovelForge 所有页面（资料库、编剧室、管线、稿件、检查点、设置）均已实现，但缺少一个关键入口：**小说项目初始化向导**。用户进入系统后，需要先完成项目基础设定（世界观、角色、风格、大纲等），才能启动管线自动写作。

现有 `scripts/init-project.sh` 提供了 CLI 初始化能力，但 Web 端缺少对应的可视化引导流程。

## 目标

提供 Web 端的小说项目初始化向导，引导用户完成从零到可执行管线的全部基础文件创建，降低使用门槛。

## 核心工作流

```
用户打开 NovelForge
  → 检测是否已有项目（config/project.yaml 是否存在）
  → 未初始化：显示初始化向导
  → 已初始化：进入正常仪表盘
```

初始化向导分步骤：

```
Step 1: 项目基础信息  →  config/project.yaml
Step 2: 世界观设定    →  lore/world/core-rules.md
Step 3: 角色创建      →  lore/characters/*.md
Step 4: 写作风格      →  lore/style/voice.md
Step 5: 大纲规划      →  outline/master-outline.md
Step 6: 管线配置确认  →  config/pipeline.yaml + config/agents.yaml
Step 7: 完成 → 跳转仪表盘
```

## 分步实现计划

### Phase 1：项目状态检测与向导入口

**范围**：首页增加项目状态检测，未初始化时展示向导入口

- [ ] 新增 API `GET /api/project/status` — 检测 `config/project.yaml` 是否存在，返回项目元信息或 `{ initialized: false }`
- [ ] 首页 `page.tsx` 增加条件渲染 — 未初始化时展示"创建新小说项目"引导卡片
- [ ] 新增 `/project/new` 页面 — 向导容器，管理步骤状态

### Phase 2：项目基础信息（Step 1）

**范围**：收集小说基本信息，生成 `config/project.yaml`

- [ ] 表单字段：小说标题、类型/题材（玄幻/都市/科幻/历史/言情/自定义）、目标字数（万字）、卷数、每章字数范围、简介/一句话概述
- [ ] 新增 API `POST /api/project/init` — 接收表单数据，写入 `config/project.yaml`
- [ ] 同时初始化目录结构：`lore/world/`、`lore/characters/`、`lore/style/`、`lore/_context/`、`outline/`、`outline/threads/`、`manuscript/`、`workspace/`、`checkpoints/`

### Phase 3：世界观设定（Step 2）

**范围**：引导用户填写或使用 AI 生成世界观

- [ ] 表单/编辑器混合界面：
  - 手动模式：直接编辑 Markdown
  - AI 辅助模式：用户提供关键词/简述 → 调用 Claude CLI 生成世界观草稿 → 用户审阅修改
- [ ] 写入 `lore/world/core-rules.md`
- [ ] 可选：追加世界观子文件（力量体系、地理、历史等）

### Phase 4：角色创建（Step 3）

**范围**：创建主要角色卡片

- [ ] 角色卡片列表界面（可添加/删除）
- [ ] 每个角色字段：姓名、身份/职业、性格特征、外貌描述、背景故事、与其他角色关系、成长弧线
- [ ] AI 辅助：根据世界观和题材自动建议角色
- [ ] 每个角色生成 `lore/characters/{name}.md`，更新 `lore/characters/_index.md`

### Phase 5：写作风格与大纲（Step 4-5）

**范围**：风格定义 + 大纲规划

- [ ] 风格设定：叙事视角（第一/第三人称）、语言风格（幽默/严肃/诗意/直白）、参考作品、禁忌与偏好
- [ ] 写入 `lore/style/voice.md`
- [ ] 大纲编辑器：
  - 结构化模式：按卷/章填写标题和摘要
  - 自由模式：直接编辑 Markdown
  - AI 辅助：根据题材+世界观+角色生成大纲建议
- [ ] 写入 `outline/master-outline.md`

### Phase 6：管线配置确认（Step 6）

**范围**：确认/调整管线和模型配置

- [ ] 展示当前 `config/pipeline.yaml` 和 `config/agents.yaml` 的关键参数（检查点间隔、重试次数等）
- [ ] 展示模型配置摘要（来自设置页已配置的模型）
- [ ] 一键确认或跳转设置页调整

### Phase 7：初始化完成与上下文生成

**范围**：生成初始上下文层，标记项目就绪

- [ ] 调用 Claude CLI 根据已创建的所有资料生成 `lore/_context/L0-global-summary.md`
- [ ] 更新 `config/project.yaml` 标记 `status: ready`
- [ ] 展示初始化总结卡片（已创建的文件清单）
- [ ] 提供"启动管线"快捷入口

## 技术要点

### 文件操作

所有文件读写通过现有 `agentClient.readFile()` / `agentClient.writeFile()` / `agentClient.listDir()` 与 Remote Agent 通信，**不新增文件操作通道**。

### AI 辅助生成

通过 `agentClient.spawnProcess()` 调用 Claude CLI，传入对应的 prompt 模板（`prompts/` 目录），获取生成结果后写入文件。

### 状态管理

- 向导步骤状态使用组件内 `useState` 或新增 `useProjectStore` 管理
- 各步骤数据在向导内流转，最终步骤统一写入文件系统

### 新增文件预估

```
web-console/src/
  app/project/new/page.tsx           # 向导主页面
  components/project-init/
    step-basic-info.tsx               # Step 1: 基础信息
    step-world-building.tsx           # Step 2: 世界观
    step-characters.tsx               # Step 3: 角色
    step-style.tsx                    # Step 4: 风格
    step-outline.tsx                  # Step 5: 大纲
    step-pipeline-config.tsx          # Step 6: 管线确认
    step-completion.tsx               # Step 7: 完成
    wizard-progress.tsx               # 步骤进度条组件
  stores/project-init-store.ts        # 向导状态管理
  app/api/project/status/route.ts     # 项目状态 API
  app/api/project/init/route.ts       # 项目初始化 API
```

## 优先级与依赖

| Phase | 优先级 | 前置依赖 | 预估复杂度 |
|-------|--------|---------|-----------|
| 1     | P0     | 无       | 低        |
| 2     | P0     | Phase 1  | 低        |
| 3     | P1     | Phase 2  | 中        |
| 4     | P1     | Phase 2  | 中        |
| 5     | P1     | Phase 3-4| 中-高     |
| 6     | P2     | Phase 2  | 低        |
| 7     | P2     | Phase 3-5| 中        |

**MVP（最小可用版本）**：Phase 1-2 + Phase 3-5 手动模式（不含 AI 辅助）即可让用户完成初始化。AI 辅助生成可后续迭代。
