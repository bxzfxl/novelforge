/**
 * 小说项目配置相关的共享类型与模板
 * 用于项目初始化向导（/project/new）与状态检测
 */

// ──────────────────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────────────────

/** config/project.yaml 的数据结构 */
export interface ProjectConfig {
  title: string;
  genre: string;
  target_words: number;
  volumes: number;
  words_per_volume: number;
  chapters_per_volume: number;
  words_per_chapter: { min: number; max: number };
  style: string;
  status: 'initializing' | 'ready' | 'writing' | 'paused' | 'completed';
}

/** 向导中单个角色卡片 */
export interface CharacterDraft {
  id: string;
  name: string;
  role: string;
  personality: string;
  appearance: string;
  background: string;
  arc: string;
}

/** 向导完整表单数据 — 七步收集的全部字段 */
export interface ProjectInitForm {
  // Step 1: 基础信息
  title: string;
  genre: string;
  synopsis: string;
  target_words: number;
  volumes: number;
  chapter_min: number;
  chapter_max: number;

  // Step 2: 世界观
  world_building: string;

  // Step 3: 角色
  characters: CharacterDraft[];

  // Step 4: 风格
  style_voice: string;
  narrative_pov: string;
  tone: string;

  // Step 5: 大纲
  outline: string;

  // Step 6: 管线配置（仅展示，不编辑）
  // 无字段，只是确认步骤
}

/** /api/project/status 响应 */
export interface ProjectStatusResponse {
  initialized: boolean;
  project?: ProjectConfig;
  error?: string;
}

// ──────────────────────────────────────────────────────────
// 常量与默认值
// ──────────────────────────────────────────────────────────

export const GENRE_OPTIONS = [
  '玄幻',
  '都市',
  '科幻',
  '历史',
  '言情',
  '悬疑',
  '武侠',
  '仙侠',
  '其他',
] as const;

export const POV_OPTIONS = [
  { value: 'third-limited', label: '第三人称有限视角' },
  { value: 'third-omniscient', label: '第三人称全知视角' },
  { value: 'first', label: '第一人称' },
] as const;

export const TONE_OPTIONS = [
  { value: 'serious', label: '严肃正剧' },
  { value: 'humorous', label: '幽默轻松' },
  { value: 'poetic', label: '诗意文艺' },
  { value: 'direct', label: '直白明快' },
  { value: 'dark', label: '暗黑沉郁' },
] as const;

/** 表单初始值 */
export const INITIAL_FORM: ProjectInitForm = {
  title: '',
  genre: '玄幻',
  synopsis: '',
  target_words: 1000000,
  volumes: 8,
  chapter_min: 4000,
  chapter_max: 5000,
  world_building: '',
  characters: [],
  style_voice: '',
  narrative_pov: 'third-limited',
  tone: 'serious',
  outline: '',
};

// ──────────────────────────────────────────────────────────
// 模板生成
// ──────────────────────────────────────────────────────────

/** 从表单数据生成 config/project.yaml 内容 */
export function buildProjectYaml(form: ProjectInitForm): ProjectConfig {
  const chapters_per_volume = 25;
  const words_per_volume = Math.floor(form.target_words / form.volumes);
  return {
    title: form.title,
    genre: form.genre,
    target_words: form.target_words,
    volumes: form.volumes,
    words_per_volume,
    chapters_per_volume,
    words_per_chapter: { min: form.chapter_min, max: form.chapter_max },
    style: form.style_voice.split('\n')[0].slice(0, 80),
    status: 'ready',
  };
}

/** 世界观文件内容（含 frontmatter） */
export function buildWorldMd(form: ProjectInitForm): string {
  return `---
type: world
title: 核心设定
created_at: ${new Date().toISOString()}
---

# ${form.title} — 世界观核心设定

${form.world_building || '（待补充）'}
`;
}

/** 单个角色文件内容 */
export function buildCharacterMd(char: CharacterDraft): string {
  return `---
type: character
name: ${char.name}
role: ${char.role}
created_at: ${new Date().toISOString()}
---

# ${char.name}

## 身份 / 定位
${char.role || '（待补充）'}

## 性格特征
${char.personality || '（待补充）'}

## 外貌描述
${char.appearance || '（待补充）'}

## 背景故事
${char.background || '（待补充）'}

## 成长弧线
${char.arc || '（待补充）'}
`;
}

/** 角色索引文件 */
export function buildCharacterIndexMd(chars: CharacterDraft[]): string {
  const lines = chars.map((c) => `- [${c.name}](${c.name}.md) — ${c.role}`).join('\n');
  return `---
type: character-index
count: ${chars.length}
---

# 角色索引

${lines || '_暂无角色_'}
`;
}

/** 风格文件内容 */
export function buildStyleMd(form: ProjectInitForm): string {
  const povLabel = POV_OPTIONS.find((p) => p.value === form.narrative_pov)?.label ?? form.narrative_pov;
  const toneLabel = TONE_OPTIONS.find((t) => t.value === form.tone)?.label ?? form.tone;
  return `---
type: style
pov: ${form.narrative_pov}
tone: ${form.tone}
---

# 写作风格设定

## 叙事视角
${povLabel}

## 整体基调
${toneLabel}

## 语言风格细节
${form.style_voice || '（待补充）'}
`;
}

/** 大纲文件内容 */
export function buildOutlineMd(form: ProjectInitForm): string {
  return `---
type: outline
title: ${form.title}
volumes: ${form.volumes}
---

# ${form.title} — 总大纲

## 一句话简介
${form.synopsis || '（待补充）'}

## 整体规划
- 目标字数：${form.target_words.toLocaleString()} 字
- 预计卷数：${form.volumes} 卷

## 大纲正文

${form.outline || '（待补充）'}
`;
}

/** 初始全局上下文 L0 文件 */
export function buildContextL0Md(form: ProjectInitForm): string {
  return `---
type: context
level: L0
scope: global
generated_at: ${new Date().toISOString()}
---

# L0 全局摘要

- **书名**：${form.title}
- **类型**：${form.genre}
- **目标字数**：${form.target_words.toLocaleString()}
- **卷数**：${form.volumes}
- **一句话简介**：${form.synopsis}
- **整体风格**：${form.style_voice.split('\n')[0].slice(0, 80)}

本文件由初始化向导自动生成，后续可由 L0 生成 Agent 动态更新。
`;
}
