'use client';

/**
 * 终端页面 — 多标签交互式终端会话管理
 * 支持同时管理多个 Claude / Gemini 终端会话
 */

import { useState, useCallback, useId } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Terminal, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useAgentStore } from '@/stores/agent-store';

// ── TerminalPanel 使用 dynamic import（xterm 依赖 DOM，禁止 SSR）──
const TerminalPanel = dynamic(
  () => import('@/components/terminal/terminal-panel'),
  {
    ssr: false,
    // 加载占位符
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a] rounded-md text-white/40 text-sm font-mono">
        正在加载终端…
      </div>
    ),
  }
);

// ──────────────────────────────────────────────
// 标签数据类型
// ──────────────────────────────────────────────

interface TerminalTab {
  /** 唯一标识 */
  id: string;
  /** CLI 类型 */
  cliType: 'claude' | 'gemini';
  /** 标签显示名称 */
  label: string;
  /** 服务端分配的终端会话 ID（创建后更新） */
  sessionId?: string;
}

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

/** 生成标签显示名称，同类型终端自动编号 */
function makeLabel(cliType: 'claude' | 'gemini', existing: TerminalTab[]): string {
  const sameType = existing.filter((t) => t.cliType === cliType);
  const index = sameType.length + 1;
  return cliType === 'claude' ? `Claude #${index}` : `Gemini #${index}`;
}

// ──────────────────────────────────────────────
// 主页面组件
// ──────────────────────────────────────────────

export default function TerminalPage() {
  // 从 Agent Store 读取连接状态
  const { connected, connect } = useAgentStore();

  // 当前所有终端标签
  const [tabs, setTabs] = useState<TerminalTab[]>([]);

  // 当前激活的标签 ID
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // 用于生成不重复的标签 ID（客户端侧）
  const baseId = useId();
  const counterRef = { current: 0 };
  const genId = useCallback(() => {
    counterRef.current += 1;
    return `${baseId}-${Date.now()}-${counterRef.current}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId]);

  // ── 添加终端标签 ──
  const addTab = useCallback(
    (cliType: 'claude' | 'gemini') => {
      const id = genId();
      const newTab: TerminalTab = {
        id,
        cliType,
        label: makeLabel(cliType, tabs),
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(id);
    },
    [tabs, genId]
  );

  // ── 关闭终端标签 ──
  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        // 若关闭的是当前激活标签，切换到最后一个
        if (activeTab === tabId) {
          setActiveTab(remaining[remaining.length - 1]?.id);
        }
        return remaining;
      });
    },
    [activeTab]
  );

  // ── 会话创建成功回调 ──
  const handleSessionCreated = useCallback(
    (tabId: string, terminalId: string) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, sessionId: terminalId } : t))
      );
    },
    []
  );

  // ──────────────────────────────────────────────
  // Agent 未连接时显示提示卡片
  // ──────────────────────────────────────────────

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <WifiOff className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Remote Agent 未连接</CardTitle>
                <CardDescription>
                  需要先连接到 Remote Agent 才能使用终端功能
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              请确保 Remote Agent 服务已在本地或远程启动（默认端口 9100），然后点击下方按钮连接。
            </p>
            <Button
              onClick={() => connect()}
              className="w-full gap-2"
            >
              <Wifi className="size-4" />
              连接到 Remote Agent
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 已连接：多标签终端界面
  // ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur shrink-0">
        {/* 标题 */}
        <Terminal className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">终端</span>

        {/* 已连接状态指示 */}
        <span className="flex items-center gap-1 ml-2 text-xs text-green-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Agent 已连接
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* 添加 Claude 终端按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addTab('claude')}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-3" />
            Claude
          </Button>

          {/* 添加 Gemini 终端按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addTab('gemini')}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-3" />
            Gemini
          </Button>
        </div>
      </div>

      {/* 无标签时的空状态 */}
      {tabs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center flex-col gap-6 text-center p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Terminal className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">还没有终端会话</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              点击上方按钮创建 Claude 或 Gemini 交互式终端会话
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => addTab('claude')} className="gap-2">
              <Plus className="size-4" />
              新建 Claude 终端
            </Button>
            <Button
              variant="outline"
              onClick={() => addTab('gemini')}
              className="gap-2"
            >
              <Plus className="size-4" />
              新建 Gemini 终端
            </Button>
          </div>
        </div>
      ) : (
        /* 多标签终端区域 */
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0 px-2 pb-2 pt-1"
        >
          {/* 标签导航栏 */}
          <TabsList variant="line" className="shrink-0 w-full justify-start gap-0.5 overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 pr-1 text-xs"
              >
                {/* CLI 类型图标 */}
                <span className={tab.cliType === 'claude' ? 'text-blue-400' : 'text-purple-400'}>
                  {tab.cliType === 'claude' ? '🤖' : '✨'}
                </span>
                <span>{tab.label}</span>
                {/* 关闭按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-0.5 rounded p-0.5 opacity-50 hover:opacity-100 hover:bg-white/10 transition-opacity"
                  title="关闭此终端"
                  aria-label={`关闭 ${tab.label}`}
                >
                  <X className="size-3" />
                </button>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 终端内容面板 */}
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 min-h-0 mt-1"
            >
              <TerminalPanel
                cliType={tab.cliType}
                sessionId={tab.sessionId}
                onSessionCreated={(terminalId) =>
                  handleSessionCreated(tab.id, terminalId)
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
