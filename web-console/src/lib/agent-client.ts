/**
 * AgentClient — 封装与 Remote Agent 的 Socket.IO 通信
 * 采用单例模式，全应用共享同一个连接实例
 */
import { io, Socket } from 'socket.io-client';

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

export type ProcessInfo = {
  id: string;
  cliType: 'claude' | 'gemini';
  role: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed';
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  outputFile?: string;
  chapterNumber?: number;
  pid?: number;
};

export type SpawnConfig = {
  id?: string;
  cliType: 'claude' | 'gemini';
  role: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  outputFile?: string;
  chapterNumber?: number;
};

/** 进程输出事件 payload */
export type ProcessOutputEvent = {
  processId: string;
  data: string;
  timestamp: string;
};

/** 进程状态变更事件 payload */
export type ProcessStatusEvent = {
  processId: string;
  status: ProcessInfo['status'];
  exitCode?: number;
};

/** 文件变更事件 payload */
export type FileChangedEvent = {
  path: string;
  type: 'add' | 'change' | 'unlink';
};

/** 终端尺寸 */
export type TerminalSize = {
  cols: number;
  rows: number;
};

/** 终端输出事件 payload */
export type TerminalOutputEvent = {
  terminalId: string;
  data: string;
};

/** 终端创建完成事件 payload */
export type TerminalCreatedEvent = {
  terminalId: string;
  cliType: 'claude' | 'gemini';
};

// ──────────────────────────────────────────────
// 事件名常量
// ──────────────────────────────────────────────

const EV = {
  // 进程管理
  PROCESS_SPAWN: 'process:spawn',
  PROCESS_KILL: 'process:kill',
  PROCESS_LIST: 'process:list',
  PROCESS_SUBSCRIBE: 'process:subscribe',
  PROCESS_UNSUBSCRIBE: 'process:unsubscribe',
  PROCESS_OUTPUT: 'process:output',
  PROCESS_STATUS: 'process:status',

  // 终端
  TERMINAL_SPAWN: 'terminal:spawn',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_CREATED: 'terminal:created',

  // 文件操作
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  FILE_CHANGED: 'file:changed',
} as const;

// ──────────────────────────────────────────────
// AgentClient 类
// ──────────────────────────────────────────────

type EventHandler<T = unknown> = (data: T) => void;

class AgentClient {
  private socket: Socket | null = null;

  // 内部事件监听器映射：eventName -> Set<handler>
  private listeners = new Map<string, Set<EventHandler>>();

  // ── 连接管理 ──────────────────────────────

  /**
   * 连接到 Remote Agent
   * @param url Remote Agent 的 WebSocket 地址，例如 http://localhost:9100
   */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 已连接则直接返回
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // 断开旧连接
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      this.socket = io(url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // 连接成功
      this.socket.once('connect', () => {
        this._bindForwardingListeners();
        resolve();
      });

      // 连接失败
      this.socket.once('connect_error', (err) => {
        reject(err);
      });
    });
  }

  /** 主动断开连接 */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** 当前是否已连接 */
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── 进程管理 ──────────────────────────────

  /** 派发进程创建请求 */
  spawnProcess(config: SpawnConfig): void {
    this._emit(EV.PROCESS_SPAWN, config);
  }

  /** 终止指定进程 */
  killProcess(processId: string): void {
    this._emit(EV.PROCESS_KILL, { processId });
  }

  /** 获取进程列表，返回 Promise<ProcessInfo[]> */
  listProcesses(): Promise<ProcessInfo[]> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve([]);
        return;
      }
      this.socket.emit(EV.PROCESS_LIST, {}, (list: ProcessInfo[]) => {
        resolve(list ?? []);
      });
    });
  }

  /** 订阅指定进程的输出流 */
  subscribeProcess(processId: string): void {
    this._emit(EV.PROCESS_SUBSCRIBE, { processId });
  }

  /** 取消订阅指定进程的输出流 */
  unsubscribeProcess(processId: string): void {
    this._emit(EV.PROCESS_UNSUBSCRIBE, { processId });
  }

  // ── 终端操作 ──────────────────────────────

  /**
   * 创建交互式终端（PTY）
   * @param cliType 使用的 CLI 类型
   * @returns Promise<string> 解析为服务端分配的 terminalId
   */
  spawnTerminal(cliType: 'claude' | 'gemini'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('未连接到 Remote Agent'));
        return;
      }
      // 服务端应通过 ack 回调返回 { terminalId }
      this.socket.emit(EV.TERMINAL_SPAWN, { cliType }, (res: { terminalId?: string; error?: string }) => {
        if (res?.error) {
          reject(new Error(res.error));
        } else if (res?.terminalId) {
          resolve(res.terminalId);
        } else {
          // 若服务端不支持 ack，生成临时 ID 并监听 terminal:created 事件
          reject(new Error('服务端未返回 terminalId'));
        }
      });
    });
  }

  /** 向终端发送输入 */
  terminalInput(terminalId: string, data: string): void {
    this._emit(EV.TERMINAL_INPUT, { terminalId, data });
  }

  /** 调整终端尺寸 */
  terminalResize(terminalId: string, size: TerminalSize): void {
    this._emit(EV.TERMINAL_RESIZE, { terminalId, ...size });
  }

  /** 终止终端进程 */
  terminalKill(terminalId: string): void {
    this._emit(EV.TERMINAL_KILL, { terminalId });
  }

  // ── 文件操作 ──────────────────────────────

  /** 读取文件内容 */
  readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('未连接到 Remote Agent'));
        return;
      }
      this.socket.emit(EV.FILE_READ, { path: filePath }, (res: { content?: string; error?: string }) => {
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve(res.content ?? '');
        }
      });
    });
  }

  /** 写入文件内容 */
  writeFile(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('未连接到 Remote Agent'));
        return;
      }
      this.socket.emit(EV.FILE_WRITE, { path: filePath, content }, (res: { error?: string }) => {
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve();
        }
      });
    });
  }

  /** 列出目录内容 */
  listDir(dirPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('未连接到 Remote Agent'));
        return;
      }
      this.socket.emit(EV.FILE_LIST, { path: dirPath }, (res: { entries?: string[]; error?: string }) => {
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve(res.entries ?? []);
        }
      });
    });
  }

  // ── 事件系统 ──────────────────────────────

  /**
   * 监听内部事件（process:output / process:status / file:changed 及其他）
   * @returns 取消监听的函数
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    // 返回取消函数
    return () => {
      this.listeners.get(event)?.delete(handler as EventHandler);
    };
  }

  // ── 私有方法 ──────────────────────────────

  /** 绑定来自 socket 的事件转发 */
  private _bindForwardingListeners(): void {
    if (!this.socket) return;

    // 转发进程输出
    this.socket.on(EV.PROCESS_OUTPUT, (data: ProcessOutputEvent) => {
      this._dispatch(EV.PROCESS_OUTPUT, data);
    });

    // 转发进程状态变更
    this.socket.on(EV.PROCESS_STATUS, (data: ProcessStatusEvent) => {
      this._dispatch(EV.PROCESS_STATUS, data);
    });

    // 转发文件变更通知
    this.socket.on(EV.FILE_CHANGED, (data: FileChangedEvent) => {
      this._dispatch(EV.FILE_CHANGED, data);
    });

    // 转发终端输出
    this.socket.on(EV.TERMINAL_OUTPUT, (data: TerminalOutputEvent) => {
      this._dispatch(EV.TERMINAL_OUTPUT, data);
    });

    // 转发终端创建完成通知
    this.socket.on(EV.TERMINAL_CREATED, (data: TerminalCreatedEvent) => {
      this._dispatch(EV.TERMINAL_CREATED, data);
    });
  }

  /** 向已注册的监听器广播事件 */
  private _dispatch(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[AgentClient] 事件处理器异常 (${event}):`, err);
      }
    });
  }

  /** 安全 emit（连接未建立时静默忽略） */
  private _emit(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[AgentClient] 尚未连接，忽略事件: ${event}`);
      return;
    }
    this.socket.emit(event, data);
  }
}

// ── 单例导出 ──────────────────────────────────
export const agentClient = new AgentClient();
