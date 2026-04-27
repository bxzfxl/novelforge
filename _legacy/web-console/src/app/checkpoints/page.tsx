'use client';

/**
 * 检查点审阅页面
 * - 左侧检查点列表（agentClient.listDir('checkpoints')）
 * - 右侧报告展示
 * - 审阅决策区：通过/驳回按钮 + 修改指令 Textarea + 下达指令按钮
 */

import { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { agentClient } from '@/lib/agent-client';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Send,
  Flag,
} from 'lucide-react';

// ── 类型定义 ────────────────────────────────────

type CheckpointStatus = 'pending' | 'approved' | 'rejected' | 'unknown';

interface CheckpointItem {
  /** 文件名（不含路径） */
  name: string;
  /** 完整文件路径 */
  path: string;
  /** 解析自文件名的状态（约定：文件名含 _approved/_rejected） */
  status: CheckpointStatus;
}

// ── 工具函数 ────────────────────────────────────

/** 从文件名推断检查点状态 */
function inferStatus(name: string): CheckpointStatus {
  if (name.includes('_approved')) return 'approved';
  if (name.includes('_rejected')) return 'rejected';
  if (name.includes('_pending')) return 'pending';
  return 'unknown';
}

function statusVariant(s: CheckpointStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
}

function statusLabel(s: CheckpointStatus): string {
  const map: Record<CheckpointStatus, string> = {
    approved: '已通过',
    rejected: '已驳回',
    pending: '待审阅',
    unknown: '未知',
  };
  return map[s];
}

// ── 指令文件路径约定 ─────────────────────────────

/** 生成审阅决策文件路径（保存在 checkpoints/ 目录下） */
function decisionPath(checkpointName: string, decision: 'approve' | 'reject'): string {
  const base = checkpointName.replace(/\.md$/, '');
  return `checkpoints/${base}_${decision === 'approve' ? 'approved' : 'rejected'}.md`;
}

/** 生成修改指令文件路径 */
function instructionPath(checkpointName: string): string {
  const base = checkpointName.replace(/\.md$/, '');
  return `checkpoints/${base}_instructions.md`;
}

// ── 组件 ────────────────────────────────────────

export default function CheckpointsPage() {
  // 检查点列表
  const [items, setItems] = useState<CheckpointItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  // 当前选中的检查点
  const [selected, setSelected] = useState<CheckpointItem | null>(null);
  // 报告内容
  const [report, setReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  // 修改指令
  const [instruction, setInstruction] = useState('');
  // 决策提交中
  const [submitting, setSubmitting] = useState(false);

  // ── 加载检查点列表 ──

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const entries = await agentClient.listDir('checkpoints');
      // 只显示主报告文件（.md 且不含 _approved/_rejected/_instructions 后缀）
      const checkpoints = entries
        .filter(
          (name: string) =>
            name.endsWith('.md') &&
            !name.includes('_approved') &&
            !name.includes('_rejected') &&
            !name.includes('_instructions'),
        )
        .map((name: string) => ({
          name,
          path: `checkpoints/${name}`,
          status: inferStatus(name),
        }));
      setItems(checkpoints);
    } catch (err) {
      toast.error(`加载检查点列表失败: ${String(err)}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ── 选中检查点，加载报告 ──

  const handleSelect = async (item: CheckpointItem) => {
    if (item.path === selected?.path) return;
    setSelected(item);
    setInstruction('');
    setLoadingReport(true);
    try {
      const raw = await agentClient.readFile(item.path);
      setReport(raw);
    } catch (err) {
      toast.error(`读取报告失败: ${String(err)}`);
    } finally {
      setLoadingReport(false);
    }
  };

  // ── 审阅决策 ──

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // 写入决策文件（空内容或附带时间戳）
      const content = `# 审阅决策\n\n决策：${decision === 'approve' ? '通过' : '驳回'}\n时间：${new Date().toISOString()}\n`;
      await agentClient.writeFile(decisionPath(selected.name, decision), content);
      toast.success(decision === 'approve' ? '已下达通过指令' : '已下达驳回指令');
      // 刷新列表
      await loadList();
    } catch (err) {
      toast.error(`下达决策失败: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── 下达修改指令 ──

  const handleInstruction = async () => {
    if (!selected || !instruction.trim()) return;
    setSubmitting(true);
    try {
      const content = `# 修改指令\n\n${instruction.trim()}\n\n---\n时间：${new Date().toISOString()}\n`;
      await agentClient.writeFile(instructionPath(selected.name), content);
      toast.success('修改指令已下达');
      setInstruction('');
    } catch (err) {
      toast.error(`下达修改指令失败: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── 渲染 ──

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">检查点审阅</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={loadList}
          disabled={loadingList}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 左侧：检查点列表 */}
        <div className="flex w-60 flex-col rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-3 py-2">
            <span className="text-sm font-medium text-stone-600">检查点列表</span>
          </div>
          <ScrollArea className="flex-1">
            {items.length === 0 ? (
              <p className="px-3 py-4 text-xs text-stone-400">
                {loadingList ? '加载中…' : '暂无检查点'}
              </p>
            ) : (
              <ul className="py-1">
                {items.map((item) => {
                  const isSelected = item.path === selected?.path;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => handleSelect(item)}
                        className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 ${
                          isSelected ? 'bg-amber-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Flag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span
                            className={`truncate text-sm font-medium ${
                              isSelected ? 'text-amber-700' : 'text-stone-800'
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="pl-5">
                          <Badge
                            variant={statusVariant(item.status)}
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* 右侧：报告 + 决策区 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
          {selected ? (
            <>
              {/* 文件路径栏 */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-stone-400" />
                  <span className="text-sm text-stone-500">{selected.path}</span>
                </div>
                <Badge variant={statusVariant(selected.status)}>
                  {statusLabel(selected.status)}
                </Badge>
              </div>

              {/* 报告内容 */}
              <ScrollArea className="flex-1 p-6">
                {loadingReport ? (
                  <p className="text-sm text-stone-400">加载中…</p>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-stone-800">
                    {report}
                  </pre>
                )}
              </ScrollArea>

              <Separator />

              {/* 审阅决策区 */}
              <div className="flex flex-col gap-3 p-4">
                <p className="text-sm font-medium text-stone-700">审阅决策</p>

                {/* 通过 / 驳回按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDecision('approve')}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    通过
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDecision('reject')}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    驳回
                  </Button>
                </div>

                <Separator className="my-1" />

                {/* 修改指令输入区 */}
                <p className="text-sm font-medium text-stone-700">下达修改指令</p>
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="输入修改指令，将写入 checkpoints/ 目录供下游管线读取…"
                  className="resize-none text-sm"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleInstruction}
                  disabled={submitting || !instruction.trim()}
                  className="self-end"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {submitting ? '提交中…' : '下达指令'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
              从左侧选择检查点开始审阅
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
