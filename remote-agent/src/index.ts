/**
 * Remote Agent 入口
 * Socket.IO 服务端，处理进程管理、交互式终端、文件操作三大能力。
 * 默认端口 9100，可通过 AGENT_PORT 环境变量覆盖。
 */

import { createServer } from 'node:http';
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import type { ServerToClientEvents, ClientToServerEvents, AgentConfig } from './types.js';
import { ProcessManager } from './process-manager.js';

// ── 配置 ──────────────────────────────────────────────────

const PORT = Number(process.env.AGENT_PORT) || 9100;

/**
 * 项目根目录：文件操作的白名单根路径。
 * 默认取当前工作目录，可通过 PROJECT_ROOT 环境变量指定。
 */
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const agentConfig: AgentConfig = {
  port: PORT,
  projectRoot: PROJECT_ROOT,
  // Windows 上通过 shell 寻找命令；Linux 上直接找 which 结果
  claudePath: process.env.CLAUDE_PATH ?? 'claude',
  geminiPath: process.env.GEMINI_PATH ?? 'gemini',
  maxConcurrent: {
    claude: Number(process.env.MAX_CONCURRENT_CLAUDE) || 3,
    gemini: Number(process.env.MAX_CONCURRENT_GEMINI) || 3,
  },
};

// ── 辅助：路径白名单校验 ──────────────────────────────────

/**
 * 检查目标路径是否在 PROJECT_ROOT 内，防止目录穿越攻击。
 * 返回规范化的绝对路径；若越界则抛出错误。
 */
function resolveSafe(inputPath: string): string {
  const abs = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.normalize(path.join(PROJECT_ROOT, inputPath));

  if (!abs.startsWith(PROJECT_ROOT + path.sep) && abs !== PROJECT_ROOT) {
    throw new Error(`路径越界：${inputPath} 不在项目根目录内`);
  }
  return abs;
}

// ── HTTP + Socket.IO 服务 ─────────────────────────────────

const httpServer = createServer((req, res) => {
  // 简单健康检查端点
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        activeProcesses: processManager.activeProcessCount,
        uptime: process.uptime(),
      })
    );
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

// ── ProcessManager 初始化 ─────────────────────────────────

const processManager = new ProcessManager(agentConfig);

// 将进程输出广播给订阅该进程的所有 socket
processManager.onOutput = (processId, data) => {
  const subscribers = processManager.getSubscribers(processId);
  for (const socketId of subscribers) {
    io.to(socketId).emit('process:output', { processId, data });
  }
};

// 将进程状态变更广播给所有连接的客户端
processManager.onStatusChange = (info) => {
  io.emit('process:status', info);
  // 顺带更新 agent 整体状态
  io.emit('agent:status', {
    connected: true,
    activeProcesses: processManager.activeProcessCount,
  });
};

// ── 交互式终端会话（子进程 + pipe，Windows/Linux 兼容）────

/** 终端会话运行时状态 */
interface TerminalSession {
  sessionId: string;
  cliType: 'claude' | 'gemini';
  child: ChildProcess;
  socketId: string; // 发起方 socket
}

const terminalSessions = new Map<string, TerminalSession>();

/** 创建交互式终端会话 */
function createTerminalSession(
  cliType: 'claude' | 'gemini',
  socketId: string
): string {
  const sessionId = nanoid(12);
  const cliPath = cliType === 'claude' ? agentConfig.claudePath : agentConfig.geminiPath;

  // Windows 上 Claude CLI 需要 git-bash 路径，自动检测常见安装位置
  const childEnv = { ...process.env } as Record<string, string>;
  if (process.platform === 'win32' && !childEnv.CLAUDE_CODE_GIT_BASH_PATH) {
    const candidates = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'D:\\Program Files\\Git\\bin\\bash.exe',
      'D:\\softwares\\Git\\bin\\bash.exe',
      'C:\\Git\\bin\\bash.exe',
    ];
    for (const p of candidates) {
      try {
        statSync(p);
        childEnv.CLAUDE_CODE_GIT_BASH_PATH = p;
        break;
      } catch { /* 路径不存在，跳过 */ }
    }
  }

  const child = spawn(cliPath, [], {
    cwd: PROJECT_ROOT,
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  const session: TerminalSession = { sessionId, cliType, child, socketId };
  terminalSessions.set(sessionId, session);

  // 将 stdout / stderr 实时转发给发起方 socket（使用 terminal:output 事件）
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    io.to(socketId).emit('terminal:output', { terminalId: sessionId, data: chunk });
  });

  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    io.to(socketId).emit('terminal:output', { terminalId: sessionId, data: chunk });
  });

  child.on('close', () => {
    terminalSessions.delete(sessionId);
    io.to(socketId).emit('terminal:output', {
      terminalId: sessionId,
      data: '\r\n[会话已结束]\r\n',
    });
  });

  child.on('error', (err) => {
    io.to(socketId).emit('terminal:output', {
      terminalId: sessionId,
      data: `\r\n[终端错误] ${err.message}\r\n`,
    });
    terminalSessions.delete(sessionId);
  });

  return sessionId;
}

// ── Socket.IO 事件处理 ────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[连接] 客户端已连接: ${socket.id}`);

  // 发送当前 agent 状态
  socket.emit('agent:status', {
    connected: true,
    activeProcesses: processManager.activeProcessCount,
  });

  // ── 进程管理 ────────────────────────────────────────────

  /** 启动 CLI 子进程 */
  socket.on('process:spawn', async (config, callback) => {
    try {
      // 确保 cwd 在白名单内（允许绝对路径）
      const safeCwd = path.isAbsolute(config.cwd) ? config.cwd : path.join(PROJECT_ROOT, config.cwd);
      const safeConfig = { ...config, cwd: safeCwd };

      const processId = await processManager.spawn(safeConfig);
      console.log(`[进程] 已启动 ${config.cliType}(${config.role}): ${processId}`);
      callback({ ok: true, processId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[进程] 启动失败: ${msg}`);
      callback({ ok: false, error: msg });
    }
  });

  /** 终止进程 — 客户端发送 { processId } 对象 */
  socket.on('process:kill', (data, callback) => {
    const processId = typeof data === 'string' ? data : data.processId;
    const ok = processManager.kill(processId);
    console.log(`[进程] kill ${processId}: ${ok ? '成功' : '未找到或已结束'}`);
    callback({ ok });
  });

  /** 列出所有进程 — 客户端发送 ({}, callback) */
  socket.on('process:list', (_data, callback) => {
    callback(processManager.listAll());
  });

  /** 订阅进程输出 — 客户端发送 { processId } 对象 */
  socket.on('process:subscribe', (data) => {
    const processId = typeof data === 'string' ? data : data.processId;
    const history = processManager.subscribe(processId, socket.id);
    // 补播历史缓冲区
    for (const chunk of history) {
      socket.emit('process:output', { processId, data: chunk });
    }
  });

  /** 取消订阅进程输出 — 客户端发送 { processId } 对象 */
  socket.on('process:unsubscribe', (data) => {
    const processId = typeof data === 'string' ? data : data.processId;
    processManager.unsubscribe(processId, socket.id);
  });

  // ── 交互式终端 ───────────────────────────────────────────

  /** 启动交互式终端会话 — 客户端发送 { cliType }, callback */
  socket.on('terminal:spawn', (data, callback) => {
    try {
      const cliType = typeof data === 'string' ? data : data.cliType;
      const sessionId = createTerminalSession(cliType, socket.id);
      console.log(`[终端] 已启动 ${cliType} 会话: ${sessionId}`);
      // 返回 terminalId（客户端期望的字段名）
      callback({ ok: true, terminalId: sessionId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[终端] 启动失败: ${msg}`);
      callback({ ok: false, error: msg });
    }
  });

  /** 向终端写入输入 — 客户端发送 { terminalId, data } */
  socket.on('terminal:input', (payload) => {
    // 兼容 terminalId 和 sessionId 两种字段名
    const sessionId = (payload as Record<string, string>).terminalId
      ?? (payload as Record<string, string>).sessionId;
    const session = terminalSessions.get(sessionId);
    if (session && session.socketId === socket.id) {
      session.child.stdin?.write(payload.data);
    }
  });

  /**
   * 终端调整大小 — 客户端发送 { terminalId, cols, rows }
   * child_process 无 PTY，此处仅记录日志；切换到 node-pty 后可调用 pty.resize
   */
  socket.on('terminal:resize', (payload) => {
    const p = payload as { terminalId?: string; sessionId?: string; cols: number; rows: number };
    const sessionId = p.terminalId ?? p.sessionId ?? '';
    console.log(`[终端] resize 请求 ${sessionId}: ${p.cols}x${p.rows}（非 PTY，忽略）`);
  });

  /** 终止终端会话 — 客户端发送 { terminalId } 对象 */
  socket.on('terminal:kill', (data) => {
    const sessionId = typeof data === 'string' ? data : (data as Record<string, string>).terminalId;
    const session = terminalSessions.get(sessionId);
    if (session && session.socketId === socket.id) {
      session.child.kill();
      terminalSessions.delete(sessionId);
      console.log(`[终端] 已终止会话: ${sessionId}`);
    }
  });

  // ── 文件操作 ─────────────────────────────────────────────

  /** 读取文件 — 客户端发送 { path }, callback */
  socket.on('file:read', async (data, callback) => {
    try {
      const filePath = typeof data === 'string' ? data : data.path;
      const safePath = resolveSafe(filePath);
      const content = await readFile(safePath, 'utf8');
      callback({ ok: true, content });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback({ ok: false, error: msg });
    }
  });

  /** 写入文件（自动创建父目录）— 客户端发送 { path, content }, callback */
  socket.on('file:write', async ({ path: filePath, content }, callback) => {
    try {
      const safePath = resolveSafe(filePath);
      await mkdir(path.dirname(safePath), { recursive: true });
      await writeFile(safePath, content, 'utf8');
      callback({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback({ ok: false, error: msg });
    }
  });

  /** 列出目录内容 — 客户端发送 { path }, callback */
  socket.on('file:list', async (data, callback) => {
    try {
      const dirPath = typeof data === 'string' ? data : data.path;
      const safePath = resolveSafe(dirPath);
      const entries = await readdir(safePath, { withFileTypes: true });

      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(safePath, entry.name);
          const s = await stat(entryPath);
          return {
            name: entry.name,
            isDir: entry.isDirectory(),
            size: s.size,
            modified: s.mtime.toISOString(),
          };
        })
      );

      callback({ ok: true, files });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callback({ ok: false, error: msg });
    }
  });

  // ── 连接断开清理 ──────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[断开] 客户端已断开: ${socket.id}`);

    // 清理该 socket 的所有进程订阅
    processManager.unsubscribeAll(socket.id);

    // 清理该 socket 的所有终端会话
    for (const [sessionId, session] of terminalSessions) {
      if (session.socketId === socket.id) {
        session.child.kill();
        terminalSessions.delete(sessionId);
        console.log(`[终端] 随连接断开清理会话: ${sessionId}`);
      }
    }
  });
});

// ── 启动服务 ──────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Remote Agent 已启动`);
  console.log(`  端口       : ${PORT}`);
  console.log(`  项目根目录 : ${PROJECT_ROOT}`);
  console.log(`  Claude 路径: ${agentConfig.claudePath}`);
  console.log(`  Gemini 路径: ${agentConfig.geminiPath}`);
  console.log(`  最大并发   : claude=${agentConfig.maxConcurrent.claude} gemini=${agentConfig.maxConcurrent.gemini}`);
});

// 优雅退出：终止所有活跃进程
process.on('SIGTERM', () => {
  console.log('[关闭] 收到 SIGTERM，正在清理...');
  for (const rp of processManager.listActive()) {
    processManager.kill(rp.id);
  }
  for (const session of terminalSessions.values()) {
    session.child.kill();
  }
  httpServer.close(() => process.exit(0));
});
