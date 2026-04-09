'use client';

/**
 * TerminalPanel — xterm.js 终端面板组件
 * 封装单个交互式终端会话的完整生命周期
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { agentClient, TerminalOutputEvent, TerminalCreatedEvent } from '@/lib/agent-client';

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

export interface TerminalPanelProps {
  /** CLI 类型：claude 或 gemini */
  cliType: 'claude' | 'gemini';
  /** 已有会话 ID（可选，不传时自动创建新会话） */
  sessionId?: string;
  /** 会话创建成功后的回调，传入分配到的 terminalId */
  onSessionCreated?: (terminalId: string) => void;
}

// ──────────────────────────────────────────────
// 连接状态类型
// ──────────────────────────────────────────────

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// 状态圆点颜色映射
const STATUS_DOT_CLASS: Record<ConnectionStatus, string> = {
  connecting: 'bg-yellow-400 animate-pulse',
  connected:  'bg-green-400',
  disconnected: 'bg-red-500',
};

// 状态文字映射
const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting:   '连接中',
  connected:    '已连接',
  disconnected: '已断开',
};

// ──────────────────────────────────────────────
// 组件
// ──────────────────────────────────────────────

export default function TerminalPanel({
  cliType,
  sessionId,
  onSessionCreated,
}: TerminalPanelProps) {
  // xterm 挂载点 DOM ref
  const containerRef = useRef<HTMLDivElement>(null);

  // xterm 实例 ref（不触发重渲染）
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 当前终端会话 ID
  const terminalIdRef = useRef<string | null>(sessionId ?? null);

  // 连接状态
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // ── 初始化 xterm ──────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // 防止 StrictMode 双次 effect 重复初始化
    if (termRef.current) return;

    // 创建 Terminal 实例（深色主题）
    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        cursor:     '#e5e5e5',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black:   '#1a1a1a',
        red:     '#ff6b6b',
        green:   '#69db7c',
        yellow:  '#ffd43b',
        blue:    '#74c0fc',
        magenta: '#da77f2',
        cyan:    '#3bc9db',
        white:   '#e5e5e5',
        brightBlack:   '#495057',
        brightRed:     '#ff8787',
        brightGreen:   '#8ce99a',
        brightYellow:  '#ffe066',
        brightBlue:    '#a5d8ff',
        brightMagenta: '#e599f7',
        brightCyan:    '#66d9e8',
        brightWhite:   '#f8f9fa',
      },
      fontFamily: 'Menlo, Monaco, "Cascadia Code", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
    });

    // 加载插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // 挂载到 DOM
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 写入欢迎信息
    term.writeln(`\x1b[36m[NovelForge]\x1b[0m 正在启动 \x1b[33m${cliType}\x1b[0m 终端会话…`);

    // ── 绑定用户输入 → 发送到服务端 ──
    term.onData((data) => {
      if (terminalIdRef.current) {
        agentClient.terminalInput(terminalIdRef.current, data);
      }
    });

    // ── 创建终端会话 ──
    const initSession = async () => {
      try {
        // 若已有 sessionId 则直接标记为已连接
        if (terminalIdRef.current) {
          setStatus('connected');
          return;
        }

        const terminalId = await agentClient.spawnTerminal(cliType);
        terminalIdRef.current = terminalId;
        setStatus('connected');
        onSessionCreated?.(terminalId);
      } catch (err) {
        // 服务端可能不支持 ack，降级监听 terminal:created 事件
        console.warn('[TerminalPanel] spawnTerminal ack 失败，降级等待 terminal:created:', err);
        // 已通过 terminal:created 监听器处理，此处只需等待
      }
    };

    initSession();

    // ── 监听终端创建完成（降级路径）──
    const unsubCreated = agentClient.on<TerminalCreatedEvent>('terminal:created', (event) => {
      if (terminalIdRef.current && terminalIdRef.current !== event.terminalId) return;
      if (!terminalIdRef.current) {
        terminalIdRef.current = event.terminalId;
        onSessionCreated?.(event.terminalId);
      }
      setStatus('connected');
    });

    // ── 监听终端输出 ──
    const unsubOutput = agentClient.on<TerminalOutputEvent>('terminal:output', (event) => {
      // 只处理本终端的输出
      if (event.terminalId !== terminalIdRef.current) return;
      term.write(event.data);
    });

    // ── ResizeObserver → 自动 fit ──
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (terminalIdRef.current) {
          agentClient.terminalResize(terminalIdRef.current, {
            cols: term.cols,
            rows: term.rows,
          });
        }
      } catch {
        // fit 时容器可能已卸载，忽略错误
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // ── 清理函数 ──
    return () => {
      unsubCreated();
      unsubOutput();
      resizeObserver.disconnect();

      // 终止终端进程
      if (terminalIdRef.current) {
        agentClient.terminalKill(terminalIdRef.current);
      }

      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 监听 agentClient 断连（简单轮询连接状态）──
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!agentClient.connected && status !== 'disconnected') {
        setStatus('disconnected');
        termRef.current?.writeln('\r\n\x1b[31m[NovelForge] 与 Remote Agent 的连接已断开\x1b[0m');
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [status]);

  // ── 键盘快捷键：Ctrl+L 清屏 ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      termRef.current?.clear();
    }
  }, []);

  // ──────────────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full bg-[#0a0a0a] rounded-md overflow-hidden border border-white/10"
      onKeyDown={handleKeyDown}
    >
      {/* 顶部状态栏 */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border-b border-white/10 shrink-0">
        {/* 状态圆点 */}
        <span
          className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT_CLASS[status]}`}
          title={STATUS_LABEL[status]}
        />
        {/* CLI 类型标签 */}
        <span className="text-xs font-mono text-white/70">
          {cliType === 'claude' ? '🤖 Claude' : '✨ Gemini'}
        </span>
        {/* 会话 ID（连接后显示） */}
        {terminalIdRef.current && (
          <span className="text-xs font-mono text-white/30 ml-auto truncate max-w-[120px]">
            {terminalIdRef.current}
          </span>
        )}
        {/* 状态文字 */}
        <span className={`text-xs ml-auto ${status === 'connected' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : 'text-red-400'}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* xterm.js 容器 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 p-1"
        style={{ overflow: 'hidden' }}
      />
    </div>
  );
}
