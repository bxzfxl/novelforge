/**
 * POST /api/project/init
 * 接收向导表单数据，写入 config/project.yaml 及所有基础资料文件。
 * 所有文件写入通过 Remote Agent 的 file:write 接口完成。
 */
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { agentClient } from '@/lib/agent-client';
import { getConfig } from '@/lib/db/queries';
import {
  buildProjectYaml,
  buildWorldMd,
  buildCharacterMd,
  buildCharacterIndexMd,
  buildStyleMd,
  buildOutlineMd,
  buildContextL0Md,
  type ProjectInitForm,
} from '@/lib/project-config';

/** 连接到 Remote Agent */
async function ensureConnected() {
  if (!agentClient.connected) {
    const url =
      getConfig('agent_url') ??
      process.env.AGENT_URL ??
      'http://localhost:9100';
    await agentClient.connect(url);
  }
}

/** 将字符写入为安全的文件名片段 */
function slugify(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'unnamed';
}

/** 校验表单必填字段 */
function validate(form: ProjectInitForm): string | null {
  if (!form.title?.trim()) return '小说标题不能为空';
  if (!form.genre?.trim()) return '类型不能为空';
  if (!form.target_words || form.target_words < 10000) return '目标字数需 ≥ 1 万';
  if (!form.volumes || form.volumes < 1) return '卷数需 ≥ 1';
  if (form.chapter_min < 500 || form.chapter_max < form.chapter_min) {
    return '章节字数范围不合法';
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const form = (await request.json()) as ProjectInitForm;

    const validationError = validate(form);
    if (validationError) {
      return NextResponse.json(
        { ok: false, error: validationError },
        { status: 400 },
      );
    }

    await ensureConnected();

    // ── 1. 写入 config/project.yaml ───────────────────────
    const projectConfig = buildProjectYaml(form);
    const projectYamlContent =
      '# 小说项目配置（由初始化向导生成）\n' +
      yaml.dump(projectConfig, { lineWidth: 120, indent: 2 });
    await agentClient.writeFile('config/project.yaml', projectYamlContent);

    // ── 2. 写入 lore/world/core-rules.md ─────────────────
    await agentClient.writeFile('lore/world/core-rules.md', buildWorldMd(form));

    // ── 3. 写入 lore/characters/*.md + _index.md ─────────
    for (const char of form.characters) {
      if (!char.name?.trim()) continue;
      const filename = `${slugify(char.name)}.md`;
      await agentClient.writeFile(`lore/characters/${filename}`, buildCharacterMd(char));
    }
    await agentClient.writeFile(
      'lore/characters/_index.md',
      buildCharacterIndexMd(form.characters),
    );

    // ── 4. 写入 lore/style/voice.md ──────────────────────
    await agentClient.writeFile('lore/style/voice.md', buildStyleMd(form));

    // ── 5. 写入 outline/master-outline.md ────────────────
    await agentClient.writeFile('outline/master-outline.md', buildOutlineMd(form));

    // ── 6. 写入 lore/_context/L0-global-summary.md ───────
    await agentClient.writeFile(
      'lore/_context/L0-global-summary.md',
      buildContextL0Md(form),
    );

    return NextResponse.json({
      ok: true,
      createdFiles: [
        'config/project.yaml',
        'lore/world/core-rules.md',
        ...form.characters
          .filter((c) => c.name?.trim())
          .map((c) => `lore/characters/${slugify(c.name)}.md`),
        'lore/characters/_index.md',
        'lore/style/voice.md',
        'outline/master-outline.md',
        'lore/_context/L0-global-summary.md',
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `初始化失败: ${message}` },
      { status: 500 },
    );
  }
}
