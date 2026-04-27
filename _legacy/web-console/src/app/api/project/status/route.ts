/**
 * GET /api/project/status
 * 检测 config/project.yaml 是否存在且填写了 title，返回项目状态
 */
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { agentClient } from '@/lib/agent-client';
import { getConfig } from '@/lib/db/queries';
import type { ProjectConfig, ProjectStatusResponse } from '@/lib/project-config';

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

    // 读取 project.yaml；若不存在视为未初始化
    let raw: string;
    try {
      raw = await agentClient.readFile('config/project.yaml');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENOENT') || msg.includes('not found') || msg.includes('不存在')) {
        const payload: ProjectStatusResponse = { initialized: false };
        return NextResponse.json(payload);
      }
      throw err;
    }

    const project = yaml.load(raw) as ProjectConfig | null;

    // title 为空或 status 为 initializing 视为未完成初始化
    const initialized = Boolean(
      project && project.title && project.status !== 'initializing'
    );

    const payload: ProjectStatusResponse = {
      initialized,
      project: project ?? undefined,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const payload: ProjectStatusResponse = {
      initialized: false,
      error: message,
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
