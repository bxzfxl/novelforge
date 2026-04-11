'use client';

/**
 * Topbar — 顶部状态栏
 * 显示项目标题、Agent 连接状态 Badge 以及运行中进程数
 */

import { useAgentStore } from '@/stores/agent-store';
import { useAgent } from '@/hooks/use-agent';
import { Badge } from '@/components/ui/badge';
import { Cpu } from 'lucide-react';

export function Topbar() {
  // Topbar 在 RootLayout 中每页渲染，在这里触发全局自动连接，
  // 这样所有页面（包括 /lore /usage /manuscript 等）都能共享同一个 Agent 连接。
  useAgent();

  const connected = useAgentStore((s) => s.connected);
  const processes = useAgentStore((s) => s.processes);

  // 运行中（status === 'running'）的进程数量
  const runningCount = processes.filter((p) => p.status === 'running').length;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5">
      {/* 左侧：项目标题 */}
      <h1 className="text-sm font-semibold text-stone-800">AI 小说工作台</h1>

      {/* 右侧：状态信息 */}
      <div className="flex items-center gap-3">
        {/* 运行中进程数 */}
        {runningCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <Cpu className="h-3.5 w-3.5 text-orange-500" />
            <span>{runningCount} 个进程运行中</span>
          </span>
        )}

        {/* Agent 连接状态 */}
        {connected ? (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 text-xs"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            已连接
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-stone-200 bg-stone-50 text-stone-500 text-xs"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-stone-400" />
            未连接
          </Badge>
        )}
      </div>
    </header>
  );
}
