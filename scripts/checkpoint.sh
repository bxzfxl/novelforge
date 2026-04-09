#!/bin/bash
# 检查点——生成审阅报告供人类审阅
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

CLAUDE_CMD="${CLAUDE_PATH:-claude}"
VOLUME_END=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --volume-end) VOLUME_END=true; shift ;;
    *) shift ;;
  esac
done

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="checkpoints/checkpoint-$TIMESTAMP.md"

echo "[检查点] 生成审阅报告..."

STATE=$(cat workspace/pipeline-state.yaml)
VOLUME=$(echo "$STATE" | grep "^current_volume:" | awk '{print $2}')
CHAPTER=$(echo "$STATE" | grep "^current_chapter:" | awk '{print $2}')

cat > "$REPORT_FILE" << EOF
# 检查点报告

- 时间：$(date -Iseconds)
- 当前进度：第 ${VOLUME} 卷 第 ${CHAPTER} 章
- 类型：$($VOLUME_END && echo "卷末检查点" || echo "定期检查点")

## 管线状态

\`\`\`yaml
$STATE
\`\`\`

## 全局摘要

$(cat lore/_context/L0-global-summary.md)

## 伏笔状态

$(cat outline/threads/foreshadow.md)

---

## 人类审阅

请在下方做出决策（编辑本文件）：

- 决策：（通过 / 修改 / 回滚）
- 备注：
- 修改指令：
EOF

# 创建 latest 符号链接
cp "$REPORT_FILE" "checkpoints/latest.md"

echo "[检查点] 报告已生成: $REPORT_FILE"
echo "[检查点] 请审阅 checkpoints/latest.md 并做出决策"
