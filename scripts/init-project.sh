#!/bin/bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 创建目录结构
dirs=(
  config
  lore/world lore/characters lore/style lore/_context
  outline/threads
  manuscript
  workspace/current workspace/archive
  checkpoints
  prompts/showrunner prompts/writers prompts/review prompts/lore
)

for d in "${dirs[@]}"; do
  mkdir -p "$d"
done

echo "[NovelForge] 项目结构初始化完成"
echo "  接下来请填写:"
echo "  1. config/project.yaml (书名、类型等)"
echo "  2. lore/world/core-rules.md (核心世界观)"
echo "  3. lore/characters/ (主要角色)"
echo "  4. lore/style/voice.md (叙事风格)"
echo "  5. outline/master-outline.md (总大纲)"
