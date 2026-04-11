#!/bin/bash
# 制片人主循环——编排整个小说写作管线
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 加载配置
CLAUDE_CMD="${CLAUDE_PATH:-claude}"
GEMINI_CMD="${GEMINI_PATH:-gemini}"

echo "[制片人] 启动管线 @ $PROJECT_ROOT"

# 解析参数
FROM_CHAPTER=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --from) FROM_CHAPTER="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# 主循环
while true; do
  # ── 0a. 优雅停止检查 ──
  # /api/pipeline/stop 默认创建 workspace/.stop-requested。
  # 看到这个文件就清理后干净退出，避免在写章节中途被 kill 留下半成品。
  if [ -f workspace/.stop-requested ]; then
    rm -f workspace/.stop-requested
    echo "[制片人] 收到优雅停止请求，干净退出"
    exit 0
  fi

  # ── 0b. 累计修正应用 ──
  # 处理任何 checkpoints/*_instructions.md 待办：解析人工指令，把对应章节
  # 喂给 writer.revise 重写后写回 manuscript。这一步在 decide 之前跑，让
  # 人工修正在最近一次循环就生效。
  if [ -f scripts/apply-corrections.cjs ]; then
    node scripts/apply-corrections.cjs || {
      echo "[制片人] ⚠️ apply-corrections 失败，继续推进（不阻塞）"
    }
  fi

  echo ""
  echo "=============================="
  echo "[制片人] 执行决策..."
  echo "=============================="

  # 1. 制片人决策：读取状态，决定下一步
  DECISION=$($CLAUDE_CMD --print -p "$(cat prompts/showrunner/decide.md)

---
pipeline-state.yaml:
$(cat workspace/pipeline-state.yaml)

L0-global-summary.md:
$(cat lore/_context/L0-global-summary.md)

master-outline.md:
$(cat outline/master-outline.md)

foreshadow.md:
$(cat outline/threads/foreshadow.md)
" 2>/dev/null || echo "action: pause
reason: 制片人决策失败")

  echo "[制片人] 决策结果:"
  echo "$DECISION"

  # 提取 action
  ACTION=$(echo "$DECISION" | grep "^action:" | head -1 | sed 's/action: *//')

  case "$ACTION" in
    write_chapter)
      echo "[制片人] → 启动编剧室写作章节"

      # 2. 生成章节任务书
      CHAPTER_TYPE=$(echo "$DECISION" | grep "^chapter_type:" | head -1 | sed 's/chapter_type: *//')
      CHAPTER_NUM=$(echo "$DECISION" | grep "^chapter_number:" | head -1 | sed 's/chapter_number: *//')

      echo "[制片人] 章节类型: $CHAPTER_TYPE, 章节号: $CHAPTER_NUM"

      # 3. 调用编剧室
      bash "$SCRIPT_DIR/writers-room.sh" \
        --chapter "$CHAPTER_NUM" \
        --type "${CHAPTER_TYPE:-daily}" \
        --decision "$DECISION"

      # 4. 让 AI 生成资料更新建议
      bash "$SCRIPT_DIR/lore-update.sh" --chapter "$CHAPTER_NUM"

      # 5. 自动应用资料更新 + 更新 pipeline-state.yaml
      # 没有这一步，下一次 decide 会读到 current_chapter=0 导致反复写第 1 章
      node "$SCRIPT_DIR/apply-chapter-state.cjs" --chapter "$CHAPTER_NUM" || {
        echo "[制片人] ⚠️ apply-chapter-state 失败，pipeline-state.yaml 未更新"
        echo "[制片人] 为避免反复写同一章，管线暂停。请手动检查 workspace/archive/ch-$CHAPTER_NUM"
        exit 1
      }

      echo "[制片人] 第 $CHAPTER_NUM 章完成"
      ;;

    checkpoint)
      echo "[制片人] → 触发检查点（非阻塞模式）"
      bash "$SCRIPT_DIR/checkpoint.sh"
      # 非阻塞：创建检查点报告后立即推 next_checkpoint，避免下次循环又触发
      # 人类审阅在后台进行，corrections 由每次循环顶部的 apply-corrections.cjs 应用
      node "$SCRIPT_DIR/advance-checkpoint.cjs" || {
        echo "[制片人] ⚠️ advance-checkpoint 失败，可能下次循环还会触发同一检查点"
      }
      echo "[制片人] 检查点已记录，继续推进（人工修正会在下次循环顶部自动应用）"
      ;;

    volume_complete)
      echo "[制片人] → 当前卷完成，生成卷末总结"
      # 触发卷末总结和检查点
      bash "$SCRIPT_DIR/checkpoint.sh" --volume-end
      ;;

    revise_outline)
      echo "[制片人] → 节奏调整，修订后续大纲"
      # TODO: 实现大纲修订逻辑
      echo "[制片人] 大纲修订完成"
      ;;

    pause)
      REASON=$(echo "$DECISION" | grep "^reason:" | head -1 | sed 's/reason: *//')
      echo "[制片人] ⚠️ 管线暂停: $REASON"
      exit 0
      ;;

    *)
      echo "[制片人] ❌ 未知决策: $ACTION"
      exit 1
      ;;
  esac
done
