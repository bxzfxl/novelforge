'use client';

/**
 * 稿件管理页面
 * - 左侧卷/章列表（通过 agentClient.listDir('manuscript') 加载）
 * - 右侧阅读器（pre 标签展示 Markdown 原文）
 */

import { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { agentClient } from '@/lib/agent-client';
import { toast } from 'sonner';
import { BookOpen, RefreshCw, FileText } from 'lucide-react';

// ── 类型定义 ────────────────────────────────────

interface ManuscriptNode {
  /** 显示名称 */
  label: string;
  /** 完整路径（相对项目根目录） */
  path: string;
  /** 是否为目录（卷） */
  isDir: boolean;
  /** 子节点（章节） */
  children?: ManuscriptNode[];
}

// ── 路径工具 ─────────────────────────────────────

/** 判断是否为目录（无扩展名） */
function looksLikeDir(name: string): boolean {
  return !name.includes('.');
}

// ── 组件 ────────────────────────────────────────

export default function ManuscriptPage() {
  // 卷/章树形列表
  const [nodes, setNodes] = useState<ManuscriptNode[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  // 当前选中的文件路径
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // 右侧内容
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  // 展开的目录集合
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // ── 加载目录树 ──

  const loadTree = useCallback(async () => {
    setLoadingList(true);
    try {
      const topEntries = await agentClient.listDir('manuscript');

      const treeNodes: ManuscriptNode[] = [];

      for (const entry of topEntries) {
        const topPath = `manuscript/${entry}`;
        if (looksLikeDir(entry)) {
          // 尝试列出子目录（卷）
          try {
            const subEntries = await agentClient.listDir(topPath);
            const children = subEntries
              .filter((s: string) => s.endsWith('.md'))
              .map((s: string) => ({
                label: s,
                path: `${topPath}/${s}`,
                isDir: false,
              }));
            treeNodes.push({
              label: entry,
              path: topPath,
              isDir: true,
              children,
            });
          } catch {
            // 无法列子目录，作为叶节点
            treeNodes.push({ label: entry, path: topPath, isDir: true, children: [] });
          }
        } else if (entry.endsWith('.md')) {
          treeNodes.push({ label: entry, path: topPath, isDir: false });
        }
      }

      setNodes(treeNodes);
    } catch (err) {
      toast.error(`加载稿件目录失败: ${String(err)}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // ── 读取章节内容 ──

  const handleSelect = async (path: string) => {
    if (path === selectedPath) return;
    setSelectedPath(path);
    setLoadingContent(true);
    try {
      const raw = await agentClient.readFile(path);
      setContent(raw);
    } catch (err) {
      toast.error(`读取章节失败: ${String(err)}`);
    } finally {
      setLoadingContent(false);
    }
  };

  // ── 切换目录展开状态 ──

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // ── 渲染 ──

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">稿件管理</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTree}
          disabled={loadingList}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 左侧：卷/章列表 */}
        <div className="flex w-60 flex-col rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-3 py-2">
            <span className="text-sm font-medium text-stone-600">卷 / 章</span>
          </div>
          <ScrollArea className="flex-1">
            {nodes.length === 0 ? (
              <p className="px-3 py-4 text-xs text-stone-400">
                {loadingList ? '加载中…' : '暂无稿件'}
              </p>
            ) : (
              <ul className="py-1">
                {nodes.map((node) => {
                  if (!node.isDir) {
                    // 顶级文件（章节直接在 manuscript/ 下）
                    return (
                      <li key={node.path}>
                        <FileItem
                          node={node}
                          selected={selectedPath === node.path}
                          onSelect={handleSelect}
                          indent={0}
                        />
                      </li>
                    );
                  }
                  // 卷目录
                  const isExpanded = expandedDirs.has(node.path);
                  return (
                    <li key={node.path}>
                      {/* 卷标题 */}
                      <button
                        onClick={() => toggleDir(node.path)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="truncate">{node.label}</span>
                        <span className="ml-auto text-stone-300">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      {/* 章节列表 */}
                      {isExpanded && (
                        <ul>
                          {(node.children ?? []).map((child) => (
                            <li key={child.path}>
                              <FileItem
                                node={child}
                                selected={selectedPath === child.path}
                                onSelect={handleSelect}
                                indent={1}
                              />
                            </li>
                          ))}
                          {(node.children ?? []).length === 0 && (
                            <li className="py-1 pl-8 text-xs text-stone-400">空目录</li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* 右侧：阅读器 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
          {selectedPath ? (
            <>
              {/* 文件路径栏 */}
              <div className="border-b border-stone-100 px-4 py-2">
                <span className="text-sm text-stone-500">{selectedPath}</span>
              </div>
              {/* 内容展示 */}
              <ScrollArea className="flex-1 p-6">
                {loadingContent ? (
                  <p className="text-sm text-stone-400">加载中…</p>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-stone-800">
                    {content}
                  </pre>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
              从左侧选择章节开始阅读
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 子组件：文件列表项 ───────────────────────────

function FileItem({
  node,
  selected,
  onSelect,
  indent,
}: {
  node: ManuscriptNode;
  selected: boolean;
  onSelect: (path: string) => void;
  indent: number;
}) {
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm transition-colors hover:bg-stone-50 ${
        selected ? 'bg-amber-50 text-amber-700 font-medium' : 'text-stone-700'
      }`}
      style={{ paddingLeft: `${(indent + 1) * 12 + 4}px` }}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="truncate">{node.label}</span>
    </button>
  );
}
