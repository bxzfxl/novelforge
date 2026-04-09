'use client';

/**
 * 编剧室页面
 * - 左侧角色面板：列出 role !== 'interactive' 的进程
 * - 右侧输出面板：订阅选中进程的实时输出
 * - 中文角色名映射
 * - 状态色：running→绿 / completed→蓝 / failed→红 / 其他→灰
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { agentClient, ProcessInfo, ProcessOutputEvent } from '@/lib/agent-client';
import { useAgentStore } from '@/stores/agent-store';
import { RefreshCw, Terminal } from 'lucide-react';

// ── 中文角色名映射 ───────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  showrunner: '制片人',
  architect: '架构师',
  writer: '写手',
  editor: '编辑',
  critic: '评论员',
  researcher: '考据员',
  continuity: '连贯性守护者',
  director: '导演',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// ── 状态颜色 ────────────────────────────────────

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusVariant(status: ProcessInfo['status']): StatusVariant {
  switch (status) {
    case 'running':
      return 'default';      // 绿（主色）
    case 'completed':
      return 'secondary';    // 蓝灰
    case 'failed':
      return 'destructive';  // 红
    default:
      return 'outline';      // 灰
  }
}

function statusLabel(status: ProcessInfo['status']): string {
  const map: Record<string, string> = {
    starting: '启动中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    killed: '已终止',
  };
  return map[status] ?? status;
}

// ── 状态点颜色（CSS class） ──────────────────────

function statusDotClass(status: ProcessInfo['status']): string {
  switch (status) {
    case 'running':
      return 'bg-green-500 animate-pulse';
    case 'completed':
      return 'bg-blue-400';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-stone-300';
  }
}

// ── 组件 ────────────────────────────────────────

export default function WritersRoomPage() {
  const { processes, refreshProcesses } = useAgentStore();

  // 过滤掉 interactive 角色
  const writerProcesses = processes.filter((p) => p.role !== 'interactive');

  // 当前选中的进程 ID
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 输出日志缓冲（processId → lines[]）
  const [outputMap, setOutputMap] = useState<Record<string, string[]>>({});
  // 滚动区域 ref（用于自动滚到底）
  const scrollEndRef = useRef<HTMLDivElement>(null);
  // 当前已订阅的进程 ID
  const subscribedRef = useRef<string | null>(null);

  // ── 追加输出行 ──

  const appendOutput = useCallback((processId: string, data: string) => {
    setOutputMap((prev) => ({
      ...prev,
      [processId]: [...(prev[processId] ?? []), data],
    }));
  }, []);

  // ── 订阅进程输出 ──

  useEffect(() => {
    // 监听所有进程的输出（全局注册一次）
    const unsub = agentClient.on<ProcessOutputEvent>('process:output', (ev) => {
      appendOutput(ev.processId, ev.data);
    });
    return unsub;
  }, [appendOutput]);

  // 选中进程时，订阅对应进程输出流
  useEffect(() => {
    if (!selectedId) return;
    if (subscribedRef.current === selectedId) return;

    // 取消旧订阅
    if (subscribedRef.current) {
      agentClient.unsubscribeProcess(subscribedRef.current);
    }
    agentClient.subscribeProcess(selectedId);
    subscribedRef.current = selectedId;

    return () => {
      // 组件卸载时取消订阅
      if (subscribedRef.current) {
        agentClient.unsubscribeProcess(subscribedRef.current);
        subscribedRef.current = null;
      }
    };
  }, [selectedId]);

  // ── 自动滚到底部 ──

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, outputMap]);

  // ── 渲染 ──

  const selectedOutput = selectedId ? (outputMap[selectedId] ?? []) : [];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">编剧室</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshProcesses}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          刷新
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 左侧：角色面板 */}
        <div className="flex w-64 flex-col rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-3 py-2">
            <span className="text-sm font-medium text-stone-600">编剧角色</span>
          </div>
          <ScrollArea className="flex-1">
            {writerProcesses.length === 0 ? (
              <p className="px-3 py-4 text-xs text-stone-400">暂无角色进程</p>
            ) : (
              <ul className="py-1">
                {writerProcesses.map((p) => {
                  const isSelected = p.id === selectedId;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedId(p.id)}
                        className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 ${
                          isSelected ? 'bg-amber-50' : ''
                        }`}
                      >
                        {/* 角色名 + 状态点 */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(p.status)}`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? 'text-amber-700' : 'text-stone-800'
                            }`}
                          >
                            {getRoleLabel(p.role)}
                          </span>
                        </div>
                        {/* CLI 类型 + 状态 Badge */}
                        <div className="flex items-center gap-1.5 pl-4">
                          <span className="text-xs text-stone-400">{p.cliType}</span>
                          <Badge variant={statusVariant(p.status)} className="h-4 px-1.5 text-[10px]">
                            {statusLabel(p.status)}
                          </Badge>
                        </div>
                        {/* 章节信息（若有） */}
                        {p.chapterNumber !== undefined && (
                          <p className="pl-4 text-xs text-stone-400">
                            第 {p.chapterNumber} 章
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* 右侧：输出面板 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-[#1a1a2e]">
          {/* 面板标题 */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
            <Terminal className="h-4 w-4 text-stone-400" />
            <span className="text-sm text-stone-300">
              {selectedId
                ? `${getRoleLabel(
                    writerProcesses.find((p) => p.id === selectedId)?.role ?? ''
                  )} — 输出流`
                : '请从左侧选择一个角色'}
            </span>
          </div>

          {/* 输出内容 */}
          <ScrollArea className="flex-1 p-4">
            {selectedOutput.length === 0 ? (
              <p className="text-sm text-stone-500">
                {selectedId ? '等待输出…' : '未选择进程'}
              </p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-green-300">
                {selectedOutput.join('')}
              </pre>
            )}
            <div ref={scrollEndRef} />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
