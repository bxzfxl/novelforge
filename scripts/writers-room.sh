#!/bin/bash
# 编剧室——编排多角色协作写作一个章节
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 统一操作 API（通过 Web 控制台路由 AI 调用）────────────
# 需要 Web 控制台在 $WEB_URL（默认 http://localhost:3000）运行
WEB_URL="${WEB_URL:-http://localhost:3000}"

# 通过 /api/operation/run 调用指定操作，返回 AI 生成的文本内容
# 用法：call_operation <operation_id> <prompt_file>
call_operation() {
  local op_id="$1"
  local prompt_file="$2"
  local system_prompt
  system_prompt=$(cat "$prompt_file")

  local response
  response=$(curl -sS -X POST "${WEB_URL}/api/operation/run" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg op "$op_id" \
      --arg sys "$system_prompt" \
      --arg usr "Generate content based on the system prompt" \
      '{operation_id: $op, system_prompt: $sys, messages: [{role: "user", content: $usr}]}')")

  local ok
  ok=$(echo "$response" | jq -r '.ok')
  if [ "$ok" != "true" ]; then
    echo "操作 $op_id 失败：" >&2
    echo "$response" | jq '.error' >&2
    return 1
  fi

  echo "$response" | jq -r '.content'
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

# 1. 生成章节任务书（使用统一 API，不再直接调用 CLI）
echo "[编剧室] Step 1: 生成章节任务书..."
call_operation "showrunner.decide" "prompts/showrunner/create-brief.md" > "$CH_DIR/chapter-brief.md"

# 2. 架构师设计结构
echo "[编剧室] Step 2: 架构师设计结构..."
call_operation "writer.architect" "prompts/writers/architect.md" > "$CH_DIR/structure-draft.md"

# 3. 主笔撰写初稿
echo "[编剧室] Step 3: 主笔撰写初稿..."
call_operation "writer.main" "prompts/writers/main-writer.md" > "$CH_DIR/draft-v1.md"

# 4. 根据章节类型决定是否启用更多角色
if [ "$CHAPTER_TYPE" = "climax" ] || [ "$CHAPTER_TYPE" = "plot_advance" ]; then
  echo "[编剧室] Step 4: 角色代言人审阅..."
  call_operation "writer.character_advocate" "prompts/writers/character-advocate.md" > "$CH_DIR/character-review.md"
fi

if [ "$CHAPTER_TYPE" = "climax" ]; then
  echo "[编剧室] Step 4b: 批评家评审..."
  call_operation "critic.review" "prompts/review/critic.md" > "$CH_DIR/critic-review.md"

  echo "[编剧室] Step 4c: 连续性审查..."
  call_operation "continuity.check" "prompts/review/continuity.md" > "$CH_DIR/continuity-review.md"
fi

# 5. 修订
echo "[编剧室] Step 5: 修订定稿..."
call_operation "writer.revise" "prompts/writers/revise.md" > "$CH_DIR/draft-final.md"

# 6. 复制定稿到稿件目录
CH_FILE="$MANUSCRIPT_DIR/ch-$(printf '%03d' $CHAPTER_NUM).md"
cp "$CH_DIR/draft-final.md" "$CH_FILE"

# 7. 生成章节摘要
echo "[编剧室] Step 6: 生成章节摘要..."
call_operation "context.summarize" "prompts/lore/generate-summary.md" > "$CH_DIR/meta.yaml"

# 8. 归档工作文件
mv "$CH_DIR" "workspace/archive/ch-$(printf '%03d' $CHAPTER_NUM)"

echo "[编剧室] 第 $CHAPTER_NUM 章完成 → $CH_FILE"
