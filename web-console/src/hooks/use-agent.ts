'use client';

/**
 * useAgent — 自动管理 Remote Agent 连接的 React Hook
 * 组件挂载时若尚未连接则自动发起连接，
 * 返回当前连接状态供 UI 消费
 */
import { useEffect } from 'react';
import { useAgentStore } from '@/stores/agent-store';

export function useAgent() {
  const connected = useAgentStore((s) => s.connected);
  const connect = useAgentStore((s) => s.connect);

  useEffect(() => {
    // 已连接则跳过，避免重复触发
    if (connected) return;

    connect().catch((err) => {
      console.error('[useAgent] 自动连接失败:', err);
    });
    // connect 函数引用稳定（Zustand action），不需要加入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return { connected };
}
