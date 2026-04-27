/**
 * GET /api/pipeline/status
 * 读取 workspace/pipeline-state.yaml，解析后以 JSON 返回管线状态
 */
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { agentClient } from '@/lib/agent-client';
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

export async function GET() {
  try {
    await ensureConnected();

    // 读取管线状态文件
    const raw = await agentClient.readFile('workspace/pipeline-state.yaml');

    // 解析 YAML
    const state = yaml.load(raw) as Record<string, unknown>;

    return NextResponse.json({ ok: true, state });
  } catch (err) {
    // 文件不存在时返回空状态，而非报错
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found') || message.includes('ENOENT')) {
      return NextResponse.json({ ok: true, state: null });
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
