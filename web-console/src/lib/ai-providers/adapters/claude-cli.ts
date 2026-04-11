import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';

/**
 * 构造给 claude CLI 用的子进程环境。
 * Windows 上 claude CLI 需要 CLAUDE_CODE_GIT_BASH_PATH 指向 git-bash，
 * 且必须是单反斜杠的 Windows 原生路径（'D:\\softwares\\Git\\bin\\bash.exe'），
 * 使用正斜杠或双反斜杠 Claude CLI 都会拒绝。
 * 若宿主环境未提供，尝试从常见安装目录自动探测。
 */
function buildClaudeEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (process.platform !== 'win32') return env;

  if (env.CLAUDE_CODE_GIT_BASH_PATH && existsSync(env.CLAUDE_CODE_GIT_BASH_PATH)) {
    return env;
  }

  // 用户在 DB 里可以覆盖这个路径
  const configured = getConfig('claude_code_git_bash_path');
  if (configured && existsSync(configured)) {
    env.CLAUDE_CODE_GIT_BASH_PATH = configured;
    return env;
  }

  // 常见安装位置（Windows 原生路径格式）
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'D:\\softwares\\Git\\bin\\bash.exe',
    'D:\\Program Files\\Git\\bin\\bash.exe',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      env.CLAUDE_CODE_GIT_BASH_PATH = p;
      return env;
    }
  }
  return env;
}

/**
 * Invokes local `claude` CLI in print+stream-json mode.
 * Parses the final `result` message for usage data. Cost is always 0.
 */
export class ClaudeCLIAdapter implements ProviderAdapter {
  id = 'anthropic-cli';
  mode = 'cli' as const;
  supportedProviders = ['anthropic'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const cliPath = getConfig('claude_cli_path') ?? 'claude';
    return new Promise((resolve) => {
      try {
        const proc = spawn(cliPath, ['--version'], {
          shell: process.platform === 'win32',
          env: buildClaudeEnv(),
        });
        let resolved = false;
        proc.on('close', (code) => {
          if (resolved) return;
          resolved = true;
          if (code === 0) resolve({ available: true });
          else resolve({ available: false, reason: `claude --version exited with code ${code}` });
        });
        proc.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({ available: false, reason: err.message });
        });
      } catch (err) {
        resolve({
          available: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('anthropic', null, `Unknown target: ${params.targetId}`);

    const cliPath = getConfig('claude_cli_path') ?? 'claude';

    // 把 user/assistant 消息拼成单条 prompt。system_prompt 走 --system-prompt-file
    // 分离传递，避免被用户的 CLAUDE.md 污染。
    const userPrompt = params.messages
      .map((m) => (m.role === 'system' ? m.content : m.content))
      .join('\n\n');
    // 给写作场景一个最小兜底 system prompt，防止用户的全局 CLAUDE.md 强加开发者身份
    const systemPrompt =
      params.systemPrompt ??
      '你是一个专业的小说写作助手。根据用户消息直接产出要求的内容，不要解释，不要输出 markdown 代码块标记，不要问澄清问题。';

    return new Promise((resolve, reject) => {
      // Windows 上 cmd.exe 会破坏 UTF-8 中文和参数里的换行，用 git-bash + 临时文件绕开。
      // 关键隔离参数：
      //  --setting-sources ""       → 不加载 user/project/local 任一级 CLAUDE.md
      //  --system-prompt-file FILE  → 用指定 system prompt 覆盖默认人格（来自用户配置）
      //  cwd = tmpDir               → 不在仓库根运行，避免加载 NovelForge CLAUDE.md / AGENTS.md
      // 这套组合可以让 claude CLI 变成"纯文本生成器"，忽略本机的 Superpowers / MCP / 插件 / 技能。
      const modelArg = target.model_id;
      let tmpPromptPath: string | null = null;
      let tmpSysPath: string | null = null;

      const cleanup = () => {
        for (const p of [tmpPromptPath, tmpSysPath]) {
          if (p) {
            try { unlinkSync(p); } catch { /* ignore */ }
          }
        }
      };

      const tmpDir = path.join(tmpdir(), 'novelforge-claude');
      try { mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }
      const reqId = nanoid(8);
      tmpPromptPath = path.join(tmpDir, `prompt-${reqId}.txt`);
      tmpSysPath = path.join(tmpDir, `sys-${reqId}.md`);
      writeFileSync(tmpPromptPath, userPrompt, 'utf8');
      writeFileSync(tmpSysPath, systemPrompt, 'utf8');

      let proc;
      if (process.platform === 'win32') {
        const env = buildClaudeEnv();
        const bashPath = env.CLAUDE_CODE_GIT_BASH_PATH;
        if (!bashPath) {
          cleanup();
          reject(new ProviderAPIError('anthropic', null, 'CLAUDE_CODE_GIT_BASH_PATH 未配置；Windows 上调用 claude CLI 需要 git-bash。'));
          return;
        }
        // bash 下用正斜杠路径；system prompt 路径也转
        const bashPromptPath = tmpPromptPath.replace(/\\/g, '/');
        const bashSysPath = tmpSysPath.replace(/\\/g, '/');
        const bashCmd = [
          'claude',
          '--print',
          '--model', `'${modelArg}'`,
          '--output-format', 'stream-json',
          '--verbose',
          '--setting-sources', '""',
          '--system-prompt-file', `'${bashSysPath}'`,
          '<', `'${bashPromptPath}'`,
        ].join(' ');
        proc = spawn(bashPath, ['-c', bashCmd], {
          env,
          shell: false,
          cwd: tmpDir,
        });
      } else {
        const args = [
          '--print',
          '--model', modelArg,
          '--output-format', 'stream-json',
          '--verbose',
          '--setting-sources', '',
          '--system-prompt-file', tmpSysPath,
        ];
        proc = spawn(cliPath, args, { env: buildClaudeEnv(), cwd: tmpDir });
        proc.stdin?.write(userPrompt);
        proc.stdin?.end();
      }

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        cleanup();
        reject(new ProviderAPIError('anthropic', null, `Spawn failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        cleanup();
        if (code !== 0) {
          reject(
            new ProviderAPIError(
              'anthropic',
              code,
              stderr || `claude CLI exited with code ${code}`,
            ),
          );
          return;
        }

        // Parse stream-json: one JSON object per line
        const lines = stdout.split('\n').filter((l) => l.trim());
        let content = '';
        let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'assistant' && obj.message?.content) {
              const parts = obj.message.content;
              if (Array.isArray(parts)) {
                for (const p of parts) {
                  if (p.type === 'text' && typeof p.text === 'string') content += p.text;
                }
              }
            }
            if (obj.type === 'result' && obj.usage) {
              usage = {
                inputTokens: obj.usage.input_tokens ?? 0,
                outputTokens: obj.usage.output_tokens ?? 0,
                cacheReadTokens: obj.usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: obj.usage.cache_creation_input_tokens ?? 0,
              };
            }
          } catch {
            // Skip non-JSON lines
          }
        }

        resolve({
          content,
          usage,
          costUsd: 0, // CLI mode = free
          wasCliMode: true,
          finishReason: 'stop',
          rawResponse: stdout,
        });
      });

      // Handle abort
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          cleanup();
          proc.kill('SIGTERM');
          reject(new ProviderAPIError('anthropic', null, 'aborted'));
        });
      }
    });
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
