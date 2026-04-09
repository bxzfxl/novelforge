/**
 * POST /api/pipeline/start
 * 通过 agentClient.spawnProcess 启动管线，并记录事件
 * 返回 { ok: true, processId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { agentClient } from '@/lib/agent-client';
import { insertEvent } from '@/lib/db/queries';
import { getConfig } from '@/lib/db/queries';

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

    // 派发管线进程
    agentClient.spawnProcess({
      id: processId,
      cliType: (body.cliType as 'claude' | 'gemini') ?? 'claude',
      role: 'showrunner',
      args: [
        '--dangerously-skip-permissions',
        '--print',
        `bash scripts/showrunner.sh`,
      ],
      cwd: body.cwd as string | undefined,
    });

    // 记录事件到数据库
    insertEvent(
      'pipeline:start',
      '管线已启动',
      { processId, triggeredBy: body.triggeredBy ?? 'manual' },
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
