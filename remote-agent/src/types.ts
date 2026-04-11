// Remote Agent 核心类型定义

export interface SpawnConfig {
  id?: string;
  cliType: 'claude' | 'gemini';
  role: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  outputFile?: string;
  chapterNumber?: number;
  /**
   * 可选命令覆盖：当提供时，直接使用该命令启动子进程，
   * 忽略 cliType 对应的 claude/gemini 路径。
   * 用于管线脚本（bash scripts/showrunner.sh）等场景。
   */
  command?: string;
}

export interface ProcessInfo {
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
}

export interface AgentConfig {
  port: number;
  projectRoot: string;
  claudePath: string;
  geminiPath: string;
  maxConcurrent: { claude: number; gemini: number };
}

/**
 * 服务端 → 客户端事件
 * 注意：terminal:output 用于终端输出，process:output 用于管线进程输出
 */
export interface ServerToClientEvents {
  'process:output': (data: { processId: string; data: string }) => void;
  'process:status': (data: ProcessInfo) => void;
  'file:changed': (data: { path: string; type: 'created' | 'modified' | 'deleted' }) => void;
  'agent:status': (data: { connected: boolean; activeProcesses: number }) => void;
  'terminal:output': (data: { terminalId: string; data: string }) => void;
  'terminal:created': (data: { terminalId: string; cliType: 'claude' | 'gemini' }) => void;
}

/**
 * 客户端 → 服务端事件
 * 与 web-console/src/lib/agent-client.ts 的实际发送格式对齐
 */
export interface ClientToServerEvents {
  'process:spawn': (
    config: SpawnConfig,
    callback: (result: { ok: boolean; processId?: string; error?: string }) => void
  ) => void;
  'process:kill': (
    data: { processId: string },
    callback: (result: { ok: boolean }) => void
  ) => void;
  'process:list': (
    data: Record<string, never>,
    callback: (processes: ProcessInfo[]) => void
  ) => void;
  'process:subscribe': (data: { processId: string }) => void;
  'process:unsubscribe': (data: { processId: string }) => void;
  'terminal:spawn': (
    data: { cliType: 'claude' | 'gemini' },
    callback: (result: { ok: boolean; terminalId?: string; error?: string }) => void
  ) => void;
  'terminal:input': (data: { terminalId: string; data: string }) => void;
  'terminal:resize': (data: { terminalId: string; cols: number; rows: number }) => void;
  'terminal:kill': (data: { terminalId: string }) => void;
  'file:read': (
    data: { path: string },
    callback: (result: { ok: boolean; content?: string; error?: string }) => void
  ) => void;
  'file:write': (
    data: { path: string; content: string },
    callback: (result: { ok: boolean; error?: string }) => void
  ) => void;
  'file:list': (
    data: { path: string },
    callback: (
      result: {
        ok: boolean;
        files?: Array<{ name: string; isDir: boolean; size: number; modified: string }>;
        error?: string;
      }
    ) => void
  ) => void;
}
