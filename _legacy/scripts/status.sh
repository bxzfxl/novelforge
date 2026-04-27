#!/bin/bash
# 状态查看——快速显示当前项目状态
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=============================="
echo "  NovelForge 项目状态"
echo "=============================="

if [ ! -f workspace/pipeline-state.yaml ]; then
  echo "  ⚠️ 项目未初始化，请运行 scripts/init-project.sh"
  exit 0
fi

# 基本信息
echo ""
echo "📖 项目配置"
if [ -f config/project.yaml ]; then
  TITLE=$(grep "^title:" config/project.yaml | sed 's/title: *//' | tr -d '"')
  GENRE=$(grep "^genre:" config/project.yaml | sed 's/genre: *//' | tr -d '"')
  TARGET=$(grep "^target_words:" config/project.yaml | awk '{print $2}')
  echo "  书名: ${TITLE:-未设置}"
  echo "  类型: ${GENRE:-未设置}"
  echo "  目标字数: ${TARGET:-未设置}"
fi

# 管线状态
echo ""
echo "⚡ 管线状态"
VOLUME=$(grep "^current_volume:" workspace/pipeline-state.yaml | awk '{print $2}')
CHAPTER=$(grep "^current_chapter:" workspace/pipeline-state.yaml | awk '{print $2}')
TOTAL_CHAPTERS=$(grep "^total_chapters_written:" workspace/pipeline-state.yaml | awk '{print $2}')
TOTAL_WORDS=$(grep "^total_words:" workspace/pipeline-state.yaml | awk '{print $2}')
LAST_ACTION=$(grep "^last_action:" workspace/pipeline-state.yaml | sed 's/last_action: *//')
LAST_STATUS=$(grep "^last_action_status:" workspace/pipeline-state.yaml | sed 's/last_action_status: *//')

echo "  当前进度: 第 ${VOLUME} 卷 第 ${CHAPTER} 章"
echo "  已写章节: ${TOTAL_CHAPTERS}"
echo "  总字数: ${TOTAL_WORDS}"
echo "  上次操作: ${LAST_ACTION} (${LAST_STATUS})"

# 稿件统计
echo ""
echo "📚 稿件统计"
if [ -d manuscript ]; then
  VOL_COUNT=$(find manuscript -maxdepth 1 -type d -name "vol-*" 2>/dev/null | wc -l)
  CH_COUNT=$(find manuscript -name "ch-*.md" 2>/dev/null | wc -l)
  echo "  卷数: ${VOL_COUNT}"
  echo "  章节文件: ${CH_COUNT}"
else
  echo "  暂无稿件"
fi

# 检查点
echo ""
echo "✅ 检查点"
if [ -d checkpoints ]; then
  CP_COUNT=$(find checkpoints -name "checkpoint-*.md" 2>/dev/null | wc -l)
  echo "  检查点数: ${CP_COUNT}"
  if [ -f checkpoints/latest.md ]; then
    echo "  最新: checkpoints/latest.md"
  fi
else
  echo "  暂无检查点"
fi

echo ""
echo "=============================="
