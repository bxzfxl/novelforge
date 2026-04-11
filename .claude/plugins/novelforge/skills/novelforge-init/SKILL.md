---
name: novelforge-init
description: "Use when the user wants to start a new NovelForge novel project from inside Claude Code. Walks through 7 wizard steps via Q&A, calls /api/operation/run with project.brainstorm to draft world / characters / style / outline, then POSTs /api/project/init to create config/project.yaml plus lore/* plus outline/master-outline.md on disk. Triggers — 新建小说项目, 开始一部新小说, 用 NovelForge 起一本书, init novelforge novel."
---

# NovelForge Init —— 用 Claude Code 初始化一部新小说

## 何时使用

当用户在 Claude Code 里说"新建一个小说项目"、"用 NovelForge 起一本书"、"我想写一部 XX 小说" 这类话，并且**当前 cwd 是 NovelForge 仓库根目录**时，调用本 skill。

如果不在 NovelForge 仓库（缺少 `web-console/`、`remote-agent/`、`scripts/showrunner.sh`），先告诉用户去对应目录再试。

## 前置检查（必须按顺序执行）

执行 `bash` 命令验证：

```bash
# 1. cwd 是 NovelForge 仓库
test -f scripts/showrunner.sh && test -d web-console && test -d remote-agent || echo "不在 NovelForge 仓库"

# 2. web-console dev 在跑（默认 :3000）
curl -sf http://localhost:3000/api/health > /dev/null && echo "web-console OK" || echo "web-console NOT running，需要先 cd web-console && pnpm dev"

# 3. remote-agent 在跑（默认 :9100）
netstat -ano 2>/dev/null | grep -q ":9100.*LISTENING" && echo "agent OK" || echo "remote-agent NOT running，需要先在 remote-agent 目录跑 pnpm dev 或 node dist/index.js"

# 4. 当前是否已有项目
curl -s http://localhost:3000/api/project/status | head -c 200
```

如果 `initialized: true`，问用户：是否要**覆盖**现有项目（会清空 `lore/`、`outline/`、`manuscript/`，建议先备份），还是退出？

如果服务没跑，**不要**自己用 `pnpm dev` 拉起后台进程；让用户在自己终端启动。

## 流程（7 步 Q&A → 一次性写入）

完整收集 7 个步骤的数据后**一次性**调用 `/api/project/init`，不要分步写文件。

### Step 1 · 基础信息（必填）

询问用户：

1. **小说标题**（中文一行）
2. **类型**（玄幻 / 都市 / 科幻 / 历史 / 言情 / 悬疑 / 武侠 / 仙侠 / 其他）
3. **目标总字数**（默认 100 万）
4. **计划卷数**（默认 8）
5. **每章字数范围**（默认 4000-5000）
6. **一句话简介**（用户没想好就跳过）

### Step 2 · 世界观

问用户："世界观你自己写还是让 AI 帮你想？"

- **AI 帮你想**：调用 brainstorm（见下方"调用 brainstorm"小节），prompt 见后面的模板。把生成结果展示给用户确认，允许用户在文本编辑里改。
- **自己写**：让用户用 markdown 写完发给你。

### Step 3 · 角色

问用户主角姓名。然后问"主角人设你自己写还是 AI 帮你想？"

- **AI 帮你想**：用主角生成 prompt（见下方），解析结构化字段。
- **自己写**：收集 name / role / personality / appearance / background / arc 六个字段。

允许用户继续添加配角，每次重复同样流程。

### Step 4 · 风格

问"叙事视角"（third-limited / third-omniscient / first）和"整体基调"（serious / humorous / poetic / direct / dark），然后让用户决定风格细节自己写还是 AI 帮想。

### Step 5 · 大纲

问用户大纲自己写还是 AI 帮想。如果 AI 写，记得把前 4 步的内容都喂给 AI 作为上下文。

### Step 6 · 管线确认

不写真正东西，只是和用户复述："默认会用 cli-only 预设（纯 Claude CLI 订阅），跑 `bash scripts/showrunner.sh` 启动管线。如果你要换 API 模式，去 web 控制台 /settings 应用别的预设。"

### Step 7 · 一次性提交

把收集到的所有数据组合成 ProjectInitForm 对象，**用 Node.js 写成 UTF-8 JSON**（不要在 bash heredoc 里嵌入中文，git-bash 在 Windows 上会编码出错），然后 curl POST 到 /api/project/init：

```bash
node -e '
const fs = require("fs");
const body = {
  title: "...", genre: "...", target_words: 1000000, volumes: 8,
  chapter_min: 4000, chapter_max: 5000, synopsis: "...",
  world_building: "...",
  characters: [{ id: "c1", name: "...", role: "...", personality: "...", appearance: "...", background: "...", arc: "..." }],
  narrative_pov: "third-limited", tone: "serious",
  style_voice: "...",
  outline: "...",
  default_cli: "claude",
};
fs.mkdirSync("workspace/tmp", { recursive: true });
fs.writeFileSync("workspace/tmp/init-body.json", JSON.stringify(body), "utf8");
'
curl -s -X POST http://localhost:3000/api/project/init \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @workspace/tmp/init-body.json \
  -o workspace/tmp/init-resp.json
node -e 'console.log(JSON.parse(require("fs").readFileSync("workspace/tmp/init-resp.json","utf8")))'
```

成功后给用户确认列表：
- `config/project.yaml`
- `lore/world/core-rules.md`
- `lore/characters/{name}.md`（每个角色一个）
- `lore/style/voice.md`
- `outline/master-outline.md`
- `lore/_context/L0-global-summary.md`

最后告诉用户下一步：

> 项目已创建。你可以：
> 1. 在 web 控制台 /pipeline 点"启动管线"开始全自动写作
> 2. 在 /settings 调整每个 operation 用什么模型
> 3. 在 /lore /manuscript /checkpoints 浏览和编辑产出

## 调用 brainstorm 的标准模板

`project.brainstorm` 是一个已经在 DB 里 seed 好的 operation，category=project，cli-only 预设默认绑到 claude-opus-4-6:cli。

**所有调用都必须用文件传 body**，不能在命令行里直接拼 JSON（git-bash on Windows 会把中文按 GBK 重新编码，传到 server 就是乱码）：

```bash
node -e '
const fs = require("fs");
const body = {
  operation_id: "project.brainstorm",
  system_prompt: SYSTEM,  // 见下方各步骤模板
  messages: [{ role: "user", content: USER }],
};
fs.mkdirSync("workspace/tmp", { recursive: true });
fs.writeFileSync("workspace/tmp/brainstorm-req.json", JSON.stringify(body), "utf8");
'
curl -s -X POST http://localhost:3000/api/operation/run \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @workspace/tmp/brainstorm-req.json \
  -o workspace/tmp/brainstorm-resp.json
# 然后用 node 读 .content 字段
node -e 'console.log(JSON.parse(require("fs").readFileSync("workspace/tmp/brainstorm-resp.json","utf8")).content)'
```

### 世界观 system prompt

```
你是一个网文世界观设计师。根据用户提供的项目基础信息，生成一份结构化的 Markdown 世界观设定文档，包含"世界基础"、"核心规则 / 力量体系"、"重要地点"、"世界矛盾"四个章节。直接输出 Markdown 内容，不要添加其他解释、不要包裹代码块标记。
```

### 主角 system prompt（用 FIELD: value 而不是 JSON，避免 Claude 用直引号导致解析失败）

```
你是一个网文角色设计师。根据用户提供的项目信息和世界观，生成一个主角的完整角色卡。

严格按以下格式输出（每个字段一行前缀，后续段落直接写在该行后面，字段之间不要空行、不要包裹代码块、不要额外解释）：

NAME: 姓名
ROLE: 身份 / 定位
PERSONALITY: 性格特征，一段话
APPEARANCE: 外貌描述，一段话
BACKGROUND: 背景故事，一段话
ARC: 成长弧线，从……到……
```

解析时按行匹配 `^(NAME|ROLE|PERSONALITY|APPEARANCE|BACKGROUND|ARC)\s*[:：]\s*` 切段。

### 风格 system prompt

```
你是一个网文文风设计师。根据用户提供的项目信息、世界观和角色，给出具体的语言风格细节建议，涵盖"叙述节奏"、"对白风格"、"描写密度"、"参考作品"、"禁忌与偏好"五个方面。直接输出 Markdown 列表，不要其他解释，不要包裹代码块。
```

### 大纲 system prompt

```
你是一个网文大纲规划师。根据用户提供的项目信息、世界观、角色、风格，产出一份分卷/分章节骨架的 Markdown 大纲。每卷包含"核心冲突"、"主要情节线"和按章节范围的分段铺排。直接输出 Markdown 内容，不要其他解释、不要包裹代码块。
```

## 红线 / 不要做的事

1. **不要**自己 spawn 后台进程跑 web-console 或 remote-agent。让用户在自己的终端起，避免你这个会话挂掉时进程一起死。
2. **不要**直接用 `Write` 工具写 `config/project.yaml` / `lore/**`。所有文件落地都走 `/api/project/init`，让 Web 后端用统一逻辑写，避免不一致。
3. **不要**在 bash `-d` / heredoc 里嵌入中文。Windows git-bash 会按系统代码页（通常 936 GBK）发送，server 收到就是乱码。**必须**用 `node -e` 写 JSON 到文件 + `curl --data-binary @file`。
4. **不要**在向用户展示 brainstorm 结果时省略中间确认。用户有权改写任何 AI 生成内容。
5. **不要**在 init 完成前清理 `workspace/tmp/`。如果某一步失败，用户可能需要那些 .json 文件来 debug。
6. **不要**用 `taskkill //IM bash.exe` 这种全局命令，会杀掉用户其他终端。

## 故障排除

| 现象 | 排查 |
|---|---|
| `/api/health` 502 / connection refused | 用户没启 web-console。让用户去 `web-console/` 跑 `pnpm dev` |
| `agent NOT running` | 用户没启 remote-agent。让用户去 `remote-agent/` 跑 `node dist/index.js`，并确保 `CLAUDE_CODE_GIT_BASH_PATH` 已设置（见 `web-console/src/lib/ai-providers/adapters/claude-cli.ts` 的 `buildClaudeEnv` 候选路径） |
| brainstorm 返回 `OperationNotConfiguredError` | 用户没应用任何预设。让用户去 /settings 应用 cli-only 预设，或者直接 `curl -X POST http://localhost:3000/api/presets/apply -d '{"preset_id":"cli-only"}'` |
| brainstorm 返回的内容看起来像"我无法理解你的请求" | 说明 claude CLI 还在加载用户级 CLAUDE.md。检查 `claude-cli.ts` 中 `--setting-sources ""` 和 `--system-prompt-file` 是否生效；测试用户独立跑 `claude --setting-sources "" --system-prompt "你是写手" --print "写一句话"` 看是否正常 |
| 主角 FIELD: value 解析失败 | 让 brainstorm 重跑一次。如果连续失败，让用户手动填 |
| 中文写入磁盘后是乱码 | 你违反了"不要在 bash 里直接拼 JSON"那条红线。回到第 7 步，用 node 写 JSON 文件 |

## 完成判断

只有当下列全部满足时才告诉用户"项目初始化完成"：

1. `curl http://localhost:3000/api/project/status` 返回 `initialized: true`
2. 磁盘上 `config/project.yaml` 存在且 `head -3` 不是乱码
3. `lore/characters/` 下能看到正确的中文文件名
4. `outline/master-outline.md` 不为空
