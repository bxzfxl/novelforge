/**
 * POST /api/pipeline/stop
 * 停止当前运行中的管线：找到所有 role === 'showrunner' 且仍在运行的进程并 kill。
 * 返回 { ok: true, killed: [processId...] }
 */
import { NextResponse } from 'next/server';
import { agentClient } from '@/lib/agent-client';
import { insertEvent, getConfig } from '@/lib/db/queries';

async function ensureConnected() {
  if (!agentClient.connected) {
    const url =
      getConfig('agent_url') ??
      process.env.AGENT_URL ??
      'http://localhost:9100';
    await agentClient.connect(url);
  }
}

export async function POST() {
  try {
    await ensureConnected();

    const processes = await agentClient.listProcesses();
    const running = processes.filter(
      (p) => p.role === 'showrunner' && (p.status === 'running' || p.status === 'starting'),
    );

    const killed: string[] = [];
    for (const p of running) {
      agentClient.killProcess(p.id);
      killed.push(p.id);
    }

    insertEvent('pipeline', '管线已停止', {
      action: 'stop',
      killedProcesses: killed,
    });

    return NextResponse.json({ ok: true, killed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
