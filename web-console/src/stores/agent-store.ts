/**
 * agent-store — 全局 Agent 连接状态管理
 * 使用 Zustand 存储连接状态与进程列表，
 * 连接成功后自动监听进程状态变更事件以保持列表同步
 */
import { create } from 'zustand';
import { agentClient, ProcessInfo, ProcessStatusEvent } from '@/lib/agent-client';

// ──────────────────────────────────────────────
// 默认 Agent 地址
// ──────────────────────────────────────────────
const DEFAULT_AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:9100';

// ──────────────────────────────────────────────
// Store 类型定义
// ──────────────────────────────────────────────

interface AgentState {
  /** 当前是否已连接 */
  connected: boolean;
  /** Remote Agent 地址 */
  agentUrl: string;
  /** 当前所有进程信息 */
  processes: ProcessInfo[];
}

interface AgentActions {
  /**
   * 连接到 Remote Agent
   * @param url 可选，覆盖默认地址
   */
  connect: (url?: string) => Promise<void>;
  /** 断开连接 */
  disconnect: () => void;
  /** 主动刷新进程列表 */
  refreshProcesses: () => Promise<void>;
}

export type AgentStore = AgentState & AgentActions;

// ──────────────────────────────────────────────
// 取消监听清理函数（模块级，避免重复注册）
// ──────────────────────────────────────────────
let unsubscribeStatus: (() => void) | null = null;

// ──────────────────────────────────────────────
// Zustand Store
// ──────────────────────────────────────────────

export const useAgentStore = create<AgentStore>((set, get) => ({
  // ── 初始状态 ──
  connected: false,
  agentUrl: DEFAULT_AGENT_URL,
  processes: [],

  // ── Actions ──

  connect: async (url?: string) => {
    const targetUrl = url ?? get().agentUrl;

    try {
      await agentClient.connect(targetUrl);

      // 更新连接状态与地址
      set({ connected: true, agentUrl: targetUrl });

      // 拉取初始进程列表
      const processes = await agentClient.listProcesses();
      set({ processes });

      // 清除旧的监听器，避免重复注册
      if (unsubscribeStatus) {
        unsubscribeStatus();
      }

      // 监听进程状态变更，同步更新 processes 列表
      unsubscribeStatus = agentClient.on<ProcessStatusEvent>(
        'process:status',
        (event) => {
          set((state) => {
            const idx = state.processes.findIndex((p) => p.id === event.processId);

            if (idx === -1) {
              // 未知进程，暂不添加（等待下次 refreshProcesses）
              return state;
            }

            // 更新对应进程的状态
            const updated = [...state.processes];
            updated[idx] = {
              ...updated[idx],
              status: event.status,
              ...(event.exitCode !== undefined ? { exitCode: event.exitCode } : {}),
            };
            return { processes: updated };
          });
        }
      );
    } catch (err) {
      console.error('[AgentStore] 连接失败:', err);
      set({ connected: false });
      throw err;
    }
  },

  disconnect: () => {
    // 清理事件监听
    if (unsubscribeStatus) {
      unsubscribeStatus();
      unsubscribeStatus = null;
    }
    agentClient.disconnect();
    set({ connected: false, processes: [] });
  },

  refreshProcesses: async () => {
    if (!agentClient.connected) return;
    const processes = await agentClient.listProcesses();
    set({ processes });
  },
}));
