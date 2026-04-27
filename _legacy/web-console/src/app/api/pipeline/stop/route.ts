/**
 * POST /api/pipeline/stop
 *
 * 默认行为（graceful）：在 PROJECT_ROOT/workspace/.stop-requested 写一个
 * sentinel 文件，showrunner 在每次循环顶部检查到这个文件后会清理它并干净
 * 退出。当前正在写的章节会自然完成（包括 lore-update 和 apply-chapter-state），
 * 不会留下半成品。
 *
 * Body 可选:
 *   { "force": true } —— 立即 hard kill 整个进程树（taskkill /F /T）。
 *                        当前章节进度会丢失，workspace/current/ch-NNN 可能不完整。
 *
 * 返回 { ok, mode: 'graceful' | 'force', killed?, sentinel? }
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
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

function projectRoot(): string {
  // Next.js dev server cwd 是 web-console/，所以项目根在 ../
  return process.env.PROJECT_ROOT
    ? path.resolve(process.env.PROJECT_ROOT)
    : path.resolve(process.cwd(), '..');
}

export async function POST(request: NextRequest) {
  try {
    let body: { force?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // 允许空 body
    }

    if (body.force) {
      // 强制硬停：杀所有 running showrunner 进程树
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

      // 同时清理可能存在的 sentinel，避免下次启动后立刻停
      try {
        const sentinel = path.join(projectRoot(), 'workspace', '.stop-requested');
        const fs = await import('node:fs');
        if (fs.existsSync(sentinel)) fs.unlinkSync(sentinel);
      } catch { /* ignore */ }

      insertEvent('pipeline', '管线已强制停止', {
        action: 'stop',
        mode: 'force',
        killedProcesses: killed,
      });

      return NextResponse.json({ ok: true, mode: 'force', killed });
    }

    // graceful：写 sentinel 文件，让 showrunner 自己干净退出
    const root = projectRoot();
    const workspaceDir = path.join(root, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    const sentinel = path.join(workspaceDir, '.stop-requested');
    writeFileSync(sentinel, new Date().toISOString(), 'utf8');

    insertEvent('pipeline', '管线已请求优雅停止', {
      action: 'stop',
      mode: 'graceful',
      sentinel,
    });

    return NextResponse.json({ ok: true, mode: 'graceful', sentinel });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
