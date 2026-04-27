#!/usr/bin/env bash
# 启动 remote-agent 服务
# 用法：bash scripts/start-agent.sh

set -euo pipefail

# ── 默认环境变量（可由外部覆盖）──────────────────────────────────────────────
: "${AGENT_PORT:=9100}"
: "${CLAUDE_PATH:=claude}"
: "${GEMINI_PATH:=gemini}"
: "${MAX_CLAUDE:=2}"
: "${MAX_GEMINI:=2}"

# 将脚本所在目录的上一级作为项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${PROJECT_ROOT:="$(dirname "$SCRIPT_DIR")"}"

# 导出供子进程读取
export AGENT_PORT
export CLAUDE_PATH
export GEMINI_PATH
export MAX_CLAUDE
export MAX_GEMINI
export PROJECT_ROOT

echo "启动 remote-agent..."
echo "  AGENT_PORT   = $AGENT_PORT"
echo "  PROJECT_ROOT = $PROJECT_ROOT"
echo "  CLAUDE_PATH  = $CLAUDE_PATH"
echo "  GEMINI_PATH  = $GEMINI_PATH"

# 切换到 remote-agent 目录并启动服务
cd "$SCRIPT_DIR/../remote-agent"
exec npx tsx src/index.ts
