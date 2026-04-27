/**
 * 一次性迁移脚本：将 config/agents.yaml 中的 model 字段替换为 operation_id。
 *
 * 运行方式：tsx scripts/migrate-to-operations.ts
 * （从仓库根目录执行）
 */
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// ESM 兼容：__dirname 需自行计算
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENTS_YAML = path.join(PROJECT_ROOT, 'config', 'agents.yaml');
const BACKUP = `${AGENTS_YAML}.bak`;

/** 角色名 → 操作 ID 映射表 */
const ROLE_TO_OPERATION: Record<string, string> = {
  architect: 'writer.architect',
  main_writer: 'writer.main',
  character_advocate: 'writer.character_advocate',
  atmosphere: 'writer.atmosphere',
  foreshadow_weaver: 'writer.foreshadow_weaver',
  revise: 'writer.revise',
  final_revise: 'writer.final_revise',
  critic: 'critic.review',
  continuity: 'continuity.check',
  continuity_checker: 'continuity.check',
  showrunner: 'showrunner.decide',
};

interface AgentsYaml {
  roles: Record<
    string,
    {
      prompt_file: string;
      model?: string;
      operation_id?: string;
      [k: string]: unknown;
    }
  >;
  [k: string]: unknown;
}

async function main() {
  // 检查文件是否存在
  try {
    await access(AGENTS_YAML);
  } catch {
    console.warn(`[迁移] 文件不存在：${AGENTS_YAML}`);
    console.warn('[迁移] 跳过迁移（config/agents.yaml 尚未创建，无需迁移）');
    process.exit(0);
  }

  // 备份原文件（保留首次备份，避免二次运行覆盖原始内容）
  try {
    await access(BACKUP);
    console.log(`✓ 备份已存在，跳过：${BACKUP}`);
  } catch {
    await copyFile(AGENTS_YAML, BACKUP);
    console.log(`✓ 备份已保存至 ${BACKUP}`);
  }

  // 读取并解析
  const raw = await readFile(AGENTS_YAML, 'utf8');
  const data = yaml.load(raw) as AgentsYaml;

  if (!data.roles) {
    console.error('[迁移] agents.yaml 中缺少 "roles" 键');
    process.exit(1);
  }

  // 逐角色迁移
  let migratedCount = 0;
  for (const [roleName, role] of Object.entries(data.roles)) {
    if (role.operation_id) {
      console.log(`  - ${roleName}: 已有 operation_id (${role.operation_id})，跳过`);
      continue;
    }
    const opId = ROLE_TO_OPERATION[roleName];
    if (!opId) {
      console.warn(`  ⚠ ${roleName}: 无操作映射，跳过`);
      continue;
    }
    role.operation_id = opId;
    delete role.model;
    console.log(`  ✓ ${roleName} → ${opId}`);
    migratedCount++;
  }

  // 回写
  const newYaml = yaml.dump(data, { lineWidth: 120, indent: 2 });
  await writeFile(AGENTS_YAML, `# 由 migrate-to-operations.ts 自动迁移\n${newYaml}`);
  console.log(`\n✓ 已迁移 ${migratedCount} 个角色`);
  console.log(`✓ 已更新 ${AGENTS_YAML}`);
}

main().catch((err) => {
  console.error('[迁移] 失败：', err);
  process.exit(1);
});
