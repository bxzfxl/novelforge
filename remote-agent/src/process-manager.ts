/**
 * ProcessManager — 使用 child_process.spawn 管理 CLI 子进程
 * Windows / Linux 通用，无需 node-pty 编译依赖。
 * 部署到 Linux 后如需完整 PTY 支持，可在此处条件替换为 node-pty。
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { SpawnConfig, ProcessInfo, AgentConfig } from './types.js';

// 单个进程的运行时状态
interface RunningProcess {
  info: ProcessInfo;
  child: ChildProcess;
  subscribers: Set<string>; // 订阅该进程输出的 socketId 集合
  outputStream?: WriteStream;
  outputBuffer: string[]; // 保留最近的输出，供新订阅者补播
}

// 输出缓冲区最大行数
const OUTPUT_BUFFER_MAX = 200;

export class ProcessManager {
  private processes = new Map<string, RunningProcess>();
  private config: AgentConfig;

  // 外部注册的事件回调
  public onOutput?: (processId: string, data: string) => void;
  public onStatusChange?: (info: ProcessInfo) => void;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // ── 并发检查 ──────────────────────────────────────────────

  /** 获取指定类型当前活跃进程数 */
  private activeCount(cliType: 'claude' | 'gemini'): number {
    let count = 0;
    for (const rp of this.processes.values()) {
      if (
        rp.info.cliType === cliType &&
        (rp.info.status === 'starting' || rp.info.status === 'running')
      ) {
        count++;
      }
    }
    return count;
  }

  /** 检查是否超过并发上限 */
  private checkConcurrency(cliType: 'claude' | 'gemini'): boolean {
    const max = this.config.maxConcurrent[cliType];
    return this.activeCount(cliType) < max;
  }

  // ── 进程生命周期 ──────────────────────────────────────────

  /**
   * 启动一个 CLI 子进程
   * @returns 分配的 processId
   */
  async spawn(config: SpawnConfig): Promise<string> {
    if (!this.checkConcurrency(config.cliType)) {
      throw new Error(
        `已达到 ${config.cliType} 最大并发数 ${this.config.maxConcurrent[config.cliType]}`
      );
    }

    const processId = config.id ?? nanoid(12);
    const cliPath =
      config.cliType === 'claude' ? this.config.claudePath : this.config.geminiPath;

    // 合并环境变量
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][]
      ),
      ...(config.env ?? {}),
    };

    const info: ProcessInfo = {
      id: processId,
      cliType: config.cliType,
      role: config.role,
      status: 'starting',
      startedAt: new Date().toISOString(),
      outputFile: config.outputFile,
      chapterNumber: config.chapterNumber,
    };

    // 确保工作目录存在
    await mkdir(config.cwd, { recursive: true });

    const child = spawn(cliPath, config.args, {
      cwd: config.cwd,
      env,
      // 非 PTY 模式，使用管道捕获 stdout/stderr
      stdio: ['pipe', 'pipe', 'pipe'],
      // Windows 上需要 shell 才能解析 PATH 中的命令
      shell: process.platform === 'win32',
    });

    info.pid = child.pid;
    info.status = 'running';

    // 打开输出文件流（若配置了 outputFile）
    let outputStream: WriteStream | undefined;
    if (config.outputFile) {
      const dir = path.dirname(config.outputFile);
      await mkdir(dir, { recursive: true });
      outputStream = createWriteStream(config.outputFile, { flags: 'a' });
    }

    const rp: RunningProcess = {
      info,
      child,
      subscribers: new Set(),
      outputStream,
      outputBuffer: [],
    };

    this.processes.set(processId, rp);
    this.onStatusChange?.(info);

    // ── 处理 stdout ──
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      this._handleOutput(processId, chunk);
    });

    // ── 处理 stderr（同样广播给订阅者，前缀 [stderr]）──
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      this._handleOutput(processId, chunk);
    });

    // ── 进程退出 ──
    child.on('close', (code) => {
      const rp = this.processes.get(processId);
      if (!rp) return;
      rp.info.status = code === 0 ? 'completed' : 'failed';
      rp.info.exitCode = code ?? undefined;
      rp.info.completedAt = new Date().toISOString();
      rp.outputStream?.end();
      this.onStatusChange?.(rp.info);
    });

    child.on('error', (err) => {
      const rp = this.processes.get(processId);
      if (!rp) return;
      rp.info.status = 'failed';
      rp.info.completedAt = new Date().toISOString();
      rp.outputStream?.end();
      this._handleOutput(processId, `[进程错误] ${err.message}\n`);
      this.onStatusChange?.(rp.info);
    });

    return processId;
  }

  /** 内部：处理并广播输出数据 */
  private _handleOutput(processId: string, data: string): void {
    const rp = this.processes.get(processId);
    if (!rp) return;

    // 写入文件
    rp.outputStream?.write(data);

    // 追加缓冲区，超出上限时丢弃最早的行
    rp.outputBuffer.push(data);
    if (rp.outputBuffer.length > OUTPUT_BUFFER_MAX) {
      rp.outputBuffer.shift();
    }

    // 广播给所有订阅者
    this.onOutput?.(processId, data);
  }

  /**
   * 终止指定进程
   */
  kill(processId: string): boolean {
    const rp = this.processes.get(processId);
    if (!rp) return false;
    if (rp.info.status === 'completed' || rp.info.status === 'failed' || rp.info.status === 'killed') {
      return false;
    }

    rp.child.kill('SIGTERM');
    // Windows 上 SIGTERM 无效，直接用 SIGKILL
    if (process.platform === 'win32') {
      rp.child.kill();
    }

    rp.info.status = 'killed';
    rp.info.completedAt = new Date().toISOString();
    rp.outputStream?.end();
    this.onStatusChange?.(rp.info);
    return true;
  }

  /**
   * 向进程 stdin 写入数据（用于交互式输入）
   */
  writeToProcess(processId: string, data: string): boolean {
    const rp = this.processes.get(processId);
    if (!rp || rp.info.status !== 'running') return false;
    rp.child.stdin?.write(data);
    return true;
  }

  // ── 订阅管理 ─────────────────────────────────────────────

  /**
   * 将 socketId 加入指定进程的订阅集合
   * @returns 历史缓冲区内容（供补播）
   */
  subscribe(processId: string, socketId: string): string[] {
    const rp = this.processes.get(processId);
    if (!rp) return [];
    rp.subscribers.add(socketId);
    return [...rp.outputBuffer];
  }

  /** 取消 socketId 对指定进程的订阅 */
  unsubscribe(processId: string, socketId: string): void {
    const rp = this.processes.get(processId);
    rp?.subscribers.delete(socketId);
  }

  /** 批量清理某个 socket 的所有订阅（socket 断开时调用） */
  unsubscribeAll(socketId: string): void {
    for (const rp of this.processes.values()) {
      rp.subscribers.delete(socketId);
    }
  }

  /** 获取进程的当前订阅者集合 */
  getSubscribers(processId: string): Set<string> {
    return this.processes.get(processId)?.subscribers ?? new Set();
  }

  // ── 查询 ─────────────────────────────────────────────────

  /** 获取单个进程信息 */
  getInfo(processId: string): ProcessInfo | undefined {
    return this.processes.get(processId)?.info;
  }

  /** 获取进程缓冲区输出 */
  getOutput(processId: string): string[] {
    return this.processes.get(processId)?.outputBuffer ?? [];
  }

  /** 获取所有活跃进程（starting / running）*/
  listActive(): ProcessInfo[] {
    const result: ProcessInfo[] = [];
    for (const rp of this.processes.values()) {
      if (rp.info.status === 'starting' || rp.info.status === 'running') {
        result.push(rp.info);
      }
    }
    return result;
  }

  /** 获取所有进程（含历史） */
  listAll(): ProcessInfo[] {
    return Array.from(this.processes.values()).map((rp) => rp.info);
  }

  /** 当前活跃进程总数 */
  get activeProcessCount(): number {
    return this.listActive().length;
  }
}
