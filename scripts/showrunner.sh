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
      echo "[制片人] → 触发检查点，暂停等待人类审阅"
      bash "$SCRIPT_DIR/checkpoint.sh"
      echo "[制片人] 检查点已创建，等待审阅..."
      # 等待人类审阅（轮询检查点状态）
      while true; do
        STATUS=$(grep "^- 决策：" checkpoints/latest.md 2>/dev/null | head -1 || echo "")
        if [ -n "$STATUS" ]; then
          echo "[制片人] 收到审阅决策: $STATUS"
          break
        fi
        sleep 30
      done
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
