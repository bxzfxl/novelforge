#!/bin/bash
# 编剧室——编排多角色协作写作一个章节
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

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

# 1. 生成章节任务书
echo "[编剧室] Step 1: 生成章节任务书..."
$CLAUDE_CMD --print -p "$(cat prompts/showrunner/create-brief.md)

---
制片人决策:
$DECISION

L0:
$(cat lore/_context/L0-global-summary.md)

大纲:
$(cat outline/master-outline.md)
" > "$CH_DIR/chapter-brief.md" 2>/dev/null

# 2. 架构师设计结构
echo "[编剧室] Step 2: 架构师设计结构..."
$CLAUDE_CMD --print -p "$(cat prompts/writers/architect.md)

---
章节任务书:
$(cat $CH_DIR/chapter-brief.md)

L0:
$(cat lore/_context/L0-global-summary.md)
" > "$CH_DIR/structure-draft.md" 2>/dev/null

# 3. 主笔撰写初稿
echo "[编剧室] Step 3: 主笔撰写初稿..."
$CLAUDE_CMD --print -p "$(cat prompts/writers/main-writer.md)

---
章节结构稿:
$(cat $CH_DIR/structure-draft.md)

风格指南:
$(cat lore/style/voice.md)
" > "$CH_DIR/draft-v1.md" 2>/dev/null

# 4. 根据章节类型决定是否启用更多角色
if [ "$CHAPTER_TYPE" = "climax" ] || [ "$CHAPTER_TYPE" = "plot_advance" ]; then
  echo "[编剧室] Step 4: 角色代言人审阅..."
  $CLAUDE_CMD --print -p "$(cat prompts/writers/character-advocate.md)

---
初稿:
$(cat $CH_DIR/draft-v1.md)
" > "$CH_DIR/character-review.md" 2>/dev/null
fi

if [ "$CHAPTER_TYPE" = "climax" ]; then
  echo "[编剧室] Step 4b: 批评家评审..."
  $GEMINI_CMD -p "$(cat prompts/review/critic.md)

---
初稿:
$(cat $CH_DIR/draft-v1.md)
" > "$CH_DIR/critic-review.md" 2>/dev/null

  echo "[编剧室] Step 4c: 连续性审查..."
  $GEMINI_CMD -p "$(cat prompts/review/continuity.md)

---
初稿:
$(cat $CH_DIR/draft-v1.md)

L0:
$(cat lore/_context/L0-global-summary.md)

世界规则:
$(cat lore/world/core-rules.md)
" > "$CH_DIR/continuity-review.md" 2>/dev/null
fi

# 5. 修订
echo "[编剧室] Step 5: 修订定稿..."
REVIEWS=""
for f in "$CH_DIR"/*-review.md; do
  [ -f "$f" ] && REVIEWS="$REVIEWS

$(basename $f):
$(cat $f)"
done

$CLAUDE_CMD --print -p "$(cat prompts/writers/revise.md)

---
初稿:
$(cat $CH_DIR/draft-v1.md)

审阅意见:
$REVIEWS
" > "$CH_DIR/draft-final.md" 2>/dev/null

# 6. 复制定稿到稿件目录
CH_FILE="$MANUSCRIPT_DIR/ch-$(printf '%03d' $CHAPTER_NUM).md"
cp "$CH_DIR/draft-final.md" "$CH_FILE"

# 7. 生成章节摘要
echo "[编剧室] Step 6: 生成章节摘要..."
$CLAUDE_CMD --print -p "$(cat prompts/lore/generate-summary.md)

---
定稿:
$(cat $CH_FILE)
" > "$CH_DIR/meta.yaml" 2>/dev/null

# 8. 归档工作文件
mv "$CH_DIR" "workspace/archive/ch-$(printf '%03d' $CHAPTER_NUM)"

echo "[编剧室] 第 $CHAPTER_NUM 章完成 → $CH_FILE"
