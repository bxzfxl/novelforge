#!/bin/bash
# 编剧室——编排多角色协作写作一个章节
set -e

# 强制 UTF-8 locale，避免 git-bash 在 Windows 上对重定向做代码页转换
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 统一操作 API（通过 Web 控制台路由 AI 调用）────────────
WEB_URL="${WEB_URL:-http://localhost:3000}"

# 通过 /api/operation/run 调用指定操作并把返回 content 写入 out_file
# 用法：call_operation <operation_id> <system_prompt_file> <user_context_file> <out_file>
# 关键：JSON 请求体和返回 content 的写文件都由 node 完成，避开 bash 管道在 Windows
# 上对 UTF-8 做的代码页转换（会把中文变成 U+FFFD）。
call_operation() {
  local op_id="$1"
  local prompt_file="$2"
  local user_file="$3"
  local out_file="$4"

  # 注意：不能用 mktemp —— 它返回 /tmp/xxx，bash 能理解但 Windows 上的 node
  # 不认识这个前缀（会解析成 D:\tmp\xxx）。用项目内 workspace/tmp 确保跨平台。
  mkdir -p workspace/tmp
  local stamp req_file resp_file
  stamp="$(date +%s)-$$-$RANDOM"
  req_file="workspace/tmp/req-${stamp}.json"
  resp_file="workspace/tmp/resp-${stamp}.json"

  # 用 node 把 request body 写成 UTF-8 JSON 到 req_file。
  # 注意：node -e 模式下 argv 不含脚本路径占位，所以 argv[1] 就是第一个用户参数，
  # 用 slice(1) 或直接用 env vars。这里统一用 env vars 避免歧义。
  OP_ID="$op_id" PROMPT_FILE="$prompt_file" USER_FILE="$user_file" REQ_FILE="$req_file" node -e '
    const fs = require("fs");
    const opId = process.env.OP_ID;
    const promptFile = process.env.PROMPT_FILE;
    const userFile = process.env.USER_FILE;
    const reqFile = process.env.REQ_FILE;
    const system = fs.readFileSync(promptFile, "utf8");
    const user = userFile && fs.existsSync(userFile)
      ? fs.readFileSync(userFile, "utf8")
      : "请根据 system prompt 中的角色职责直接产出内容。";
    const body = {
      operation_id: opId,
      system_prompt: system,
      messages: [{ role: "user", content: user }],
    };
    fs.writeFileSync(reqFile, JSON.stringify(body), "utf8");
  '

  # 用 curl 发送并把响应写到文件（--data-binary + @file 避免 shell 处理 body）
  curl -sS -X POST "${WEB_URL}/api/operation/run" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary @"$req_file" \
    -o "$resp_file"

  # 用 node 解析响应并把 content 写入 out_file（UTF-8）
  # 用环境变量传参，避免 bash 引号 / 路径转义的意外
  if ! RESP_FILE="$resp_file" OUT_FILE="$out_file" node -e '
    const fs = require("fs");
    const respFile = process.env.RESP_FILE;
    const outFile = process.env.OUT_FILE;
    if (!respFile || !outFile) {
      console.error("missing RESP_FILE or OUT_FILE env");
      process.exit(1);
    }
    const raw = fs.readFileSync(respFile, "utf8");
    let res;
    try { res = JSON.parse(raw); } catch (e) {
      console.error("响应不是合法 JSON:", raw.slice(0, 300));
      process.exit(1);
    }
    if (!res.ok) {
      console.error("操作失败:", JSON.stringify(res.error || res));
      process.exit(1);
    }
    fs.writeFileSync(outFile, res.content, "utf8");
  '; then
    echo "[call_operation] FAILED. Keeping req=$req_file resp=$resp_file for debugging" >&2
    return 1
  fi

  rm -f "$req_file" "$resp_file"
}

# 拼装所有角色档案到一个字符串
gather_characters() {
  if [ -d lore/characters ]; then
    for f in lore/characters/*.md; do
      [ -f "$f" ] && [ "$(basename "$f")" != "_index.md" ] && echo "---" && cat "$f" && echo ""
    done
  fi
}

# 获取最近 3 章的摘要（如果有）
gather_recent_summaries() {
  local vol_dir="workspace/archive"
  if [ -d "$vol_dir" ]; then
    for d in $(ls -d ${vol_dir}/ch-* 2>/dev/null | tail -3); do
      if [ -f "$d/meta.yaml" ]; then
        echo "## $(basename $d)"
        cat "$d/meta.yaml"
        echo ""
      fi
    done
  fi
}

# 保留旧变量以防脚本其他部分直接引用（不再用于 AI 调用）
CLAUDE_CMD="${CLAUDE_PATH:-claude}"
GEMINI_CMD="${GEMINI_PATH:-gemini}"

# 解析参数
CHAPTER_NUM=""
CHAPTER_TYPE="daily"
DECISION=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --chapter) CHAPTER_NUM="$2"; shift 2 ;;
    --type) CHAPTER_TYPE="$2"; shift 2 ;;
    --decision) DECISION="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$CHAPTER_NUM" ]; then
  echo "[编剧室] 错误：缺少 --chapter 参数"
  exit 1
fi

CH_DIR="workspace/current/ch-$(printf '%03d' $CHAPTER_NUM)"
mkdir -p "$CH_DIR"

VOLUME=$(grep "^current_volume:" workspace/pipeline-state.yaml | awk '{print $2}')
MANUSCRIPT_DIR="manuscript/vol-$(printf '%02d' $VOLUME)"
mkdir -p "$MANUSCRIPT_DIR"

echo "[编剧室] 开始第 $CHAPTER_NUM 章（$CHAPTER_TYPE）"

# ── 预备共享上下文 ─────────────────────────────────

PROJECT_INFO=$(cat config/project.yaml 2>/dev/null || echo "")
STYLE_VOICE=$(cat lore/style/voice.md 2>/dev/null || echo "")
WORLD_RULES=$(cat lore/world/core-rules.md 2>/dev/null || echo "")
MASTER_OUTLINE=$(cat outline/master-outline.md 2>/dev/null || echo "")
L0_SUMMARY=$(cat lore/_context/L0-global-summary.md 2>/dev/null || echo "")
CHARACTERS=$(gather_characters)
RECENT_SUMS=$(gather_recent_summaries)

# ── Step 1: 生成章节任务书 ─────────────────────────
echo "[编剧室] Step 1: 生成章节任务书..."
cat > "$CH_DIR/step1-ctx.md" <<EOF
# 任务
基于以下项目状态，为第 $CHAPTER_NUM 章（类型：$CHAPTER_TYPE）生成章节任务书。

## 制片人决策
$DECISION

## 项目概况
$PROJECT_INFO

## 总大纲
$MASTER_OUTLINE

## L0 全局摘要
$L0_SUMMARY

## 最近 3 章摘要
$RECENT_SUMS
EOF
call_operation "showrunner.decide" "prompts/showrunner/create-brief.md" "$CH_DIR/step1-ctx.md" "$CH_DIR/chapter-brief.md"

# ── Step 2: 架构师设计结构 ─────────────────────────
echo "[编剧室] Step 2: 架构师设计结构..."
cat > "$CH_DIR/step2-ctx.md" <<EOF
# 任务
根据章节任务书和以下上下文，设计第 $CHAPTER_NUM 章的场景结构。

## 章节任务书
$(cat "$CH_DIR/chapter-brief.md")

## 项目概况
$PROJECT_INFO

## 世界观核心规则
$WORLD_RULES

## 角色档案
$CHARACTERS

## 风格指南
$STYLE_VOICE

## 最近 3 章摘要
$RECENT_SUMS
EOF
call_operation "writer.architect" "prompts/writers/architect.md" "$CH_DIR/step2-ctx.md" "$CH_DIR/structure-draft.md"

# ── Step 3: 主笔撰写初稿 ───────────────────────────
echo "[编剧室] Step 3: 主笔撰写初稿..."
cat > "$CH_DIR/step3-ctx.md" <<EOF
# 任务
严格按照章节结构稿撰写第 $CHAPTER_NUM 章的完整正文。直接输出 Markdown 格式的章节正文，不要添加任何说明。

## 章节结构稿
$(cat "$CH_DIR/structure-draft.md")

## 角色档案
$CHARACTERS

## 风格指南
$STYLE_VOICE

## 世界观核心规则
$WORLD_RULES

## 最近 3 章摘要
$RECENT_SUMS
EOF
call_operation "writer.main" "prompts/writers/main-writer.md" "$CH_DIR/step3-ctx.md" "$CH_DIR/draft-v1.md"

# ── Step 4: 可选的角色/批评家审阅 ───────────────────
if [ "$CHAPTER_TYPE" = "climax" ] || [ "$CHAPTER_TYPE" = "plot_advance" ]; then
  echo "[编剧室] Step 4: 角色代言人审阅..."
  cat > "$CH_DIR/step4-ctx.md" <<EOF
# 任务
检查以下章节初稿中各角色的言行是否符合角色档案设定，标出 OOC 处并给出修改建议。

## 初稿
$(cat "$CH_DIR/draft-v1.md")

## 角色档案
$CHARACTERS
EOF
  call_operation "writer.character_advocate" "prompts/writers/character-advocate.md" "$CH_DIR/step4-ctx.md" "$CH_DIR/character-review.md"
fi

if [ "$CHAPTER_TYPE" = "climax" ]; then
  echo "[编剧室] Step 4b: 批评家评审..."
  cat > "$CH_DIR/step4b-ctx.md" <<EOF
$(cat "$CH_DIR/draft-v1.md")
EOF
  call_operation "critic.review" "prompts/review/critic.md" "$CH_DIR/step4b-ctx.md" "$CH_DIR/critic-review.md"

  echo "[编剧室] Step 4c: 连续性审查..."
  cat > "$CH_DIR/step4c-ctx.md" <<EOF
## 当前章节初稿
$(cat "$CH_DIR/draft-v1.md")

## 世界观
$WORLD_RULES

## 最近 3 章摘要
$RECENT_SUMS
EOF
  call_operation "continuity.check" "prompts/review/continuity.md" "$CH_DIR/step4c-ctx.md" "$CH_DIR/continuity-review.md"
fi

# ── Step 5: 修订定稿 ───────────────────────────────
echo "[编剧室] Step 5: 修订定稿..."
FEEDBACK=""
[ -f "$CH_DIR/character-review.md" ] && FEEDBACK="$FEEDBACK\n## 角色代言人反馈\n$(cat "$CH_DIR/character-review.md")"
[ -f "$CH_DIR/critic-review.md" ] && FEEDBACK="$FEEDBACK\n## 批评家反馈\n$(cat "$CH_DIR/critic-review.md")"
[ -f "$CH_DIR/continuity-review.md" ] && FEEDBACK="$FEEDBACK\n## 连续性反馈\n$(cat "$CH_DIR/continuity-review.md")"

cat > "$CH_DIR/step5-ctx.md" <<EOF
# 任务
基于反馈修订以下章节初稿，输出最终定稿。直接输出 Markdown 格式的章节正文，不要添加说明。

## 初稿
$(cat "$CH_DIR/draft-v1.md")

## 反馈
${FEEDBACK:-无反馈}

## 风格指南
$STYLE_VOICE
EOF
call_operation "writer.revise" "prompts/writers/revise.md" "$CH_DIR/step5-ctx.md" "$CH_DIR/draft-final.md"

# ── Step 6: 复制定稿到稿件目录 ─────────────────────
CH_FILE="$MANUSCRIPT_DIR/ch-$(printf '%03d' $CHAPTER_NUM).md"
cp "$CH_DIR/draft-final.md" "$CH_FILE"

# ── Step 7: 生成章节摘要 ───────────────────────────
echo "[编剧室] Step 6: 生成章节摘要..."
cat > "$CH_DIR/step7-ctx.md" <<EOF
# 任务
为以下章节正文生成结构化 meta.yaml 摘要。输出 yaml 格式，包含 scenes（场景列表）、foreshadow_planted（新植入伏笔）、foreshadow_resolved（回收伏笔）、key_events（关键事件）等字段。

## 章节正文
$(cat "$CH_FILE")
EOF
call_operation "context.summarize" "prompts/lore/generate-summary.md" "$CH_DIR/step7-ctx.md" "$CH_DIR/meta.yaml"

# ── Step 8: 归档工作文件 ───────────────────────────
mkdir -p workspace/archive
mv "$CH_DIR" "workspace/archive/ch-$(printf '%03d' $CHAPTER_NUM)"

echo "[编剧室] 第 $CHAPTER_NUM 章完成 → $CH_FILE"
