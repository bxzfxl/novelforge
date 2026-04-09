'use client';

/**
 * 仪表盘首页
 * 展示 Agent 连接状态统计卡片 + 最近进程列表
 */

import { useAgentStore } from '@/stores/agent-store';
import { useAgent } from '@/hooks/use-agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, CheckCircle2, XCircle, Wifi } from 'lucide-react';

// ──────────────────────────────────────────────
// 进程状态 → Badge 样式映射
// ──────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  running: {
    label: '运行中',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  starting: {
    label: '启动中',
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  completed: {
    label: '已完成',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  failed: {
    label: '失败',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  killed: {
    label: '已终止',
    className: 'border-stone-200 bg-stone-50 text-stone-600',
  },
};

// ──────────────────────────────────────────────
// 统计卡片组件
// ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="border-stone-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-stone-500">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? 'text-stone-400'}`} />
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <p className={`text-2xl font-bold ${accent ?? 'text-stone-800'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 仪表盘页面
// ──────────────────────────────────────────────

export default function DashboardPage() {
  // 自动发起连接
  useAgent();

  const connected = useAgentStore((s) => s.connected);
  const processes = useAgentStore((s) => s.processes);

  const runningCount = processes.filter((p) => p.status === 'running').length;
  const completedCount = processes.filter((p) => p.status === 'completed').length;
  const failedCount = processes.filter((p) => p.status === 'failed').length;

  // 最近 10 条进程（按启动时间倒序）
  const recentProcesses = [...processes]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold text-stone-800">仪表盘</h2>
        <p className="mt-1 text-sm text-stone-500">系统运行概览</p>
      </div>

      {/* 统计卡片 4 列 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Agent 状态"
          value={connected ? '已连接' : '未连接'}
          icon={Wifi}
          accent={connected ? 'text-green-500' : 'text-stone-400'}
        />
        <StatCard
          title="运行中进程"
          value={runningCount}
          icon={Cpu}
          accent="text-orange-500"
        />
        <StatCard
          title="已完成"
          value={completedCount}
          icon={CheckCircle2}
          accent="text-green-500"
        />
        <StatCard
          title="失败"
          value={failedCount}
          icon={XCircle}
          accent={failedCount > 0 ? 'text-red-500' : 'text-stone-400'}
        />
      </div>

      {/* 最近进程列表 */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">最近进程</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {recentProcesses.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">暂无进程记录</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentProcesses.map((proc) => {
                const style = STATUS_STYLES[proc.status] ?? {
                  label: proc.status,
                  className: 'border-stone-200 bg-stone-50 text-stone-600',
                };
                return (
                  <li key={proc.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {proc.role}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {proc.cliType.toUpperCase()}
                        {proc.chapterNumber != null && ` · 第 ${proc.chapterNumber} 章`}
                        {' · '}
                        {new Date(proc.startedAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-4 shrink-0 text-xs ${style.className}`}
                    >
                      {style.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
