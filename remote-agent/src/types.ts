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

export interface ServerToClientEvents {
  'process:output': (data: { processId: string; data: string }) => void;
  'process:status': (data: ProcessInfo) => void;
  'file:changed': (data: { path: string; type: 'created' | 'modified' | 'deleted' }) => void;
  'agent:status': (data: { connected: boolean; activeProcesses: number }) => void;
}

export interface ClientToServerEvents {
  'process:spawn': (
    config: SpawnConfig,
    callback: (result: { ok: boolean; processId?: string; error?: string }) => void
  ) => void;
  'process:kill': (
    processId: string,
    callback: (result: { ok: boolean }) => void
  ) => void;
  'process:list': (callback: (processes: ProcessInfo[]) => void) => void;
  'process:subscribe': (processId: string) => void;
  'process:unsubscribe': (processId: string) => void;
  'terminal:spawn': (
    cliType: 'claude' | 'gemini',
    callback: (result: { ok: boolean; sessionId?: string; error?: string }) => void
  ) => void;
  'terminal:input': (data: { sessionId: string; data: string }) => void;
  'terminal:resize': (data: { sessionId: string; cols: number; rows: number }) => void;
  'terminal:kill': (sessionId: string) => void;
  'file:read': (
    filePath: string,
    callback: (result: { ok: boolean; content?: string; error?: string }) => void
  ) => void;
  'file:write': (
    data: { path: string; content: string },
    callback: (result: { ok: boolean; error?: string }) => void
  ) => void;
  'file:list': (
    dirPath: string,
    callback: (
      result: {
        ok: boolean;
        files?: Array<{ name: string; isDir: boolean; size: number; modified: string }>;
        error?: string;
      }
    ) => void
  ) => void;
}
