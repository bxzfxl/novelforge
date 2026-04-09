/**
 * lore.ts — 资料库工具函数
 * 封装对 lore 目录下各类 Markdown 文件的增删改查操作
 * 通过 agentClient 与 Remote Agent 通信，用 gray-matter 解析 frontmatter
 */
import matter from 'gray-matter';
import { agentClient } from '@/lib/agent-client';

// ── 目录映射 ────────────────────────────────────

/** 资料库类型对应的远端目录路径 */
export const dirMap: Record<string, string> = {
  world: 'lore/world',
  characters: 'lore/characters',
  style: 'lore/style',
  context: 'lore/_context',
};

// ── 类型定义 ────────────────────────────────────

/** 解析后的资料条目 */
export interface LoreEntry {
  /** 文件相对路径（含目录前缀） */
  filePath: string;
  /** frontmatter 数据 */
  data: Record<string, unknown>;
  /** 正文内容 */
  content: string;
  /** 原始文件内容 */
  raw: string;
}

// ── 工具函数 ────────────────────────────────────

/**
 * 列出某类型下所有 .md 文件路径
 * @param type 资料类型，对应 dirMap 的键
 * @returns 文件路径数组（已过滤为 .md 文件）
 */
export async function listLoreByType(type: string): Promise<string[]> {
  const dir = dirMap[type];
  if (!dir) throw new Error(`未知资料类型: ${type}`);

  const entries = await agentClient.listDir(dir);
  // 只保留 .md 文件，并拼接完整路径
  return entries
    .filter((name) => name.endsWith('.md'))
    .map((name) => `${dir}/${name}`);
}

/**
 * 读取单个资料文件并解析 frontmatter
 * @param filePath 文件路径（相对于项目根目录）
 */
export async function readLoreFile(filePath: string): Promise<LoreEntry> {
  const raw = await agentClient.readFile(filePath);
  const { data, content } = matter(raw);
  return { filePath, data, content, raw };
}

/**
 * 保存资料文件
 * @param filePath 文件路径（相对于项目根目录）
 * @param rawContent 文件完整内容（含 frontmatter）
 */
export async function saveLoreFile(
  filePath: string,
  rawContent: string,
): Promise<void> {
  await agentClient.writeFile(filePath, rawContent);
}
