'use client';

/**
 * 管线控制页面
 * - 4 列统计卡片：当前进度/上次操作/Token 消耗/下次检查点
 * - 状态信号面板（plot_deviation / consistency_warnings / pacing_scores）
 * - 启动管线 / 刷新状态按钮
 * - 每 5 秒轮询 /api/pipeline/status
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  PlayCircle,
  StopCircle,
  RefreshCw,
  Activity,
  Clock,
  Coins,
  Flag,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useAgentStore } from '@/stores/agent-store';

// ── 类型定义 ────────────────────────────────────

interface PipelineSignals {
  plot_deviation?: number | string;
  consistency_warnings?: number | string;
  pacing_scores?: Record<string, number> | string;
}

interface PipelineState {
  current_chapter?: number;
  total_chapters?: number;
  last_action?: string;
  last_action_at?: string;
  total_tokens?: number;
  next_checkpoint?: number | string;
  status?: string;
  signals?: PipelineSignals;
}

// ── 工具函数 ────────────────────────────────────

/** 格式化 token 数量（超过 1k 用 k 单位） */
function formatTokens(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 信号等级 → Badge variant */
function deviationVariant(val: number | string | undefined): 'default' | 'secondary' | 'destructive' {
  if (val === undefined || val === null) return 'secondary';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return 'secondary';
  if (n > 0.3) return 'destructive';
  if (n > 0.1) return 'default';
  return 'secondary';
}

// ── 组件 ────────────────────────────────────────

export default function PipelinePage() {
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 从 agent store 读取运行中的 showrunner 进程，用于判断"停止"按钮是否可用
  const processes = useAgentStore((s) => s.processes);
  const refreshProcesses = useAgentStore((s) => s.refreshProcesses);
  const runningShowrunners = processes.filter(
    (p) => p.role === 'showrunner' && (p.status === 'running' || p.status === 'starting'),
  );
  const hasRunning = runningShowrunners.length > 0;

  // ── 拉取状态 ──

  const fetchStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/pipeline/status');
      const json = await res.json();
      if (json.ok) {
        setPipelineState(json.state ?? null);
      } else {
        if (!silent) toast.error(`获取状态失败: ${json.error}`);
      }
    } catch (err) {
      if (!silent) toast.error(`请求失败: ${String(err)}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── 启动管线 ──

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/pipeline/start', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        toast.success(`管线已启动，进程 ID: ${json.processId}`);
        // 立即刷新一次 agent 进程列表，让"停止管线"按钮尽快出现
        refreshProcesses().catch(() => {});
        // 稍后再刷一次管线 state
        setTimeout(() => fetchStatus(true), 1500);
      } else {
        toast.error(`启动失败: ${json.error}`);
      }
    } catch (err) {
      toast.error(`启动请求失败: ${String(err)}`);
    } finally {
      setStarting(false);
    }
  };

  // ── 停止管线 ──
  // 默认 graceful：让当前章节自然写完后退出（写 sentinel 文件，showrunner 自查）
  // force=true: 立即 hard kill 进程树（按住 Shift 点击 或 confirm 二选一）

  const handleStop = async (force: boolean) => {
    const msg = force
      ? '【强制停止】立即杀掉管线进程树。当前正在写的章节会被打断，workspace/current/ 可能留下半成品。确定？'
      : '【优雅停止】管线会在写完当前章节、更新完资料后干净退出。继续？';
    if (!confirm(msg)) return;

    setStopping(true);
    try {
      const res = await fetch('/api/pipeline/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.ok) {
        if (json.mode === 'force') {
          const n = Array.isArray(json.killed) ? json.killed.length : 0;
          toast.success(n > 0 ? `已强制停止 ${n} 个管线进程` : '没有正在运行的管线');
        } else {
          toast.success('已请求优雅停止，当前章节写完后会退出');
        }
        refreshProcesses().catch(() => {});
        setTimeout(() => fetchStatus(true), 1000);
      } else {
        toast.error(`停止失败: ${json.error}`);
      }
    } catch (err) {
      toast.error(`停止请求失败: ${String(err)}`);
    } finally {
      setStopping(false);
    }
  };

  // ── 轮询（5 秒） ──

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(() => fetchStatus(true), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 衍生数据 ──

  const progress =
    pipelineState?.current_chapter !== undefined &&
    pipelineState?.total_chapters
      ? `第 ${pipelineState.current_chapter} / ${pipelineState.total_chapters} 章`
      : '—';

  const signals = pipelineState?.signals ?? {};

  // ── 渲染 ──

  return (
    <div className="flex flex-col gap-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">管线控制</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {hasRunning ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStop(false)}
                disabled={stopping}
                title="让当前章节自然写完后退出，不会留下半成品"
              >
                <StopCircle className="mr-1.5 h-4 w-4" />
                {stopping ? '停止中…' : '优雅停止'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStop(true)}
                disabled={stopping}
                title="立即杀掉进程树，当前章节进度会丢失"
              >
                <StopCircle className="mr-1.5 h-4 w-4" />
                强制停止
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleStart} disabled={starting}>
              <PlayCircle className="mr-1.5 h-4 w-4" />
              {starting ? '启动中…' : '启动管线'}
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 当前进度 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">当前进度</CardTitle>
            <Activity className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-800">{progress}</p>
            {pipelineState?.status && (
              <Badge
                variant={pipelineState.status === 'running' ? 'default' : 'secondary'}
                className="mt-1 text-xs"
              >
                {pipelineState.status}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* 上次操作 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">上次操作</CardTitle>
            <Clock className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold text-stone-800">
              {pipelineState?.last_action ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              {pipelineState?.last_action_at ?? ''}
            </p>
          </CardContent>
        </Card>

        {/* Token 消耗 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Token 消耗</CardTitle>
            <Coins className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-800">
              {formatTokens(pipelineState?.total_tokens)}
            </p>
          </CardContent>
        </Card>

        {/* 下次检查点 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">下次检查点</CardTitle>
            <Flag className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-800">
              {pipelineState?.next_checkpoint !== undefined
                ? `第 ${pipelineState.next_checkpoint} 章`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 状态信号面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-stone-700">状态信号</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          {/* 情节偏差 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <AlertTriangle className="h-4 w-4" />
              情节偏差 (plot_deviation)
            </div>
            <Badge
              variant={deviationVariant(signals.plot_deviation)}
              className="w-fit text-base font-semibold"
            >
              {signals.plot_deviation !== undefined
                ? String(signals.plot_deviation)
                : '—'}
            </Badge>
          </div>

          {/* 一致性警告 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <AlertTriangle className="h-4 w-4" />
              一致性警告 (consistency_warnings)
            </div>
            <Badge
              variant={
                signals.consistency_warnings
                  ? Number(signals.consistency_warnings) > 0
                    ? 'destructive'
                    : 'secondary'
                  : 'secondary'
              }
              className="w-fit text-base font-semibold"
            >
              {signals.consistency_warnings !== undefined
                ? String(signals.consistency_warnings)
                : '—'}
            </Badge>
          </div>

          {/* 节奏评分 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <TrendingUp className="h-4 w-4" />
              节奏评分 (pacing_scores)
            </div>
            {signals.pacing_scores && typeof signals.pacing_scores === 'object' ? (
              <ul className="space-y-1">
                {Object.entries(signals.pacing_scores).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    <span className="text-stone-500">{k}:</span>
                    <span className="font-medium text-stone-800">{v}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-stone-400">
                {signals.pacing_scores !== undefined
                  ? String(signals.pacing_scores)
                  : '—'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 暂无数据提示 */}
      {pipelineState === null && !loading && (
        <p className="text-center text-sm text-stone-400">
          暂无管线状态数据，请先初始化项目或启动管线
        </p>
      )}
    </div>
  );
}
