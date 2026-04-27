#!/bin/bash
# 资料更新——章节完成后刷新上下文层
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

CLAUDE_CMD="${CLAUDE_PATH:-claude}"
CHAPTER_NUM=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --chapter) CHAPTER_NUM="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$CHAPTER_NUM" ]; then
  echo "[资料更新] 错误：缺少 --chapter 参数"
  exit 1
fi

CH_ARCHIVE="workspace/archive/ch-$(printf '%03d' $CHAPTER_NUM)"

if [ ! -f "$CH_ARCHIVE/meta.yaml" ]; then
  echo "[资料更新] 警告：未找到章节摘要 $CH_ARCHIVE/meta.yaml，跳过"
  exit 0
fi

echo "[资料更新] 更新上下文层（第 $CHAPTER_NUM 章）..."

$CLAUDE_CMD --print -p "$(cat prompts/lore/refresh-context.md)

---
章节摘要:
$(cat $CH_ARCHIVE/meta.yaml)

当前 L0:
$(cat lore/_context/L0-global-summary.md)

伏笔登记簿:
$(cat outline/threads/foreshadow.md)
" > "$CH_ARCHIVE/context-updates.yaml" 2>/dev/null

echo "[资料更新] 更新建议已生成: $CH_ARCHIVE/context-updates.yaml"
echo "[资料更新] 由 scripts/apply-chapter-state.cjs 在 showrunner 主循环里自动应用"
