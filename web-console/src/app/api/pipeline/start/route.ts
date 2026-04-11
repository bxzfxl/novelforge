/**
 * POST /api/pipeline/start
 * 通过 agentClient.spawnProcess 启动管线，并记录事件
 * 返回 { ok: true, processId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { nanoid } from 'nanoid';
import { agentClient } from '@/lib/agent-client';
import { insertEvent } from '@/lib/db/queries';
import { getConfig } from '@/lib/db/queries';

/**
 * 在 Windows 上定位 git-bash 路径，注入给 showrunner 子进程，
 * 使其内部 `claude --print` 调用不会因缺少 CLAUDE_CODE_GIT_BASH_PATH 失败。
 */
function detectGitBashPath(): string | undefined {
  if (process.platform !== 'win32') return undefined;
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH && existsSync(process.env.CLAUDE_CODE_GIT_BASH_PATH)) {
    return process.env.CLAUDE_CODE_GIT_BASH_PATH;
  }
  const configured = getConfig('claude_code_git_bash_path');
  if (configured && existsSync(configured)) return configured;
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'D:\\softwares\\Git\\bin\\bash.exe',
    'D:\\Program Files\\Git\\bin\\bash.exe',
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return undefined;
}

/** 连接到 Remote Agent（按需初始化） */
async function ensureConnected() {
  if (!agentClient.connected) {
    const url =
      getConfig('agent_url') ??
      process.env.AGENT_URL ??
      'http://localhost:9100';
    await agentClient.connect(url);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnected();

    // 解析可选的请求体参数
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // 允许空 body
    }

    const processId = nanoid();

    // 派发管线进程：直接跑 bash scripts/showrunner.sh，
    // showrunner.sh 内部会按需调用 claude / gemini CLI。
    // cliType 仍保留用于并发记账（管线本身算在 claude 名下）。
    //
    // 关键：把 WEB_URL 和 CLAUDE_CODE_GIT_BASH_PATH 注入到子进程 env，
    // 使 showrunner 内部的 claude --print 和 writers-room.sh 的 curl 都能工作。
    const gitBashPath = detectGitBashPath();
    const childEnv: Record<string, string> = {
      WEB_URL: process.env.WEB_URL ?? 'http://localhost:3000',
    };
    if (gitBashPath) childEnv.CLAUDE_CODE_GIT_BASH_PATH = gitBashPath;

    agentClient.spawnProcess({
      id: processId,
      cliType: (body.cliType as 'claude' | 'gemini') ?? 'claude',
      role: 'showrunner',
      command: 'bash',
      args: ['scripts/showrunner.sh'],
      cwd: body.cwd as string | undefined,
      env: childEnv,
    });

    // 记录事件到数据库
    // events.type 受 CHECK 约束限制为 pipeline|writers_room|lore_update|checkpoint|error|system
    insertEvent(
      'pipeline',
      '管线已启动',
      { action: 'start', processId, triggeredBy: body.triggeredBy ?? 'manual' },
    );

    return NextResponse.json({ ok: true, processId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
