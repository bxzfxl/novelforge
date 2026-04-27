import {
  setCategoryDefault,
  setOperationOverride,
  clearCategoryDefault,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db/index';
import { seedOperations } from '@/lib/db/seed-operations';
import { seedModelTargets } from '@/lib/db/seed-model-targets';

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  estimatedCost100Chapters: string;
  requirements: string[];
  categoryDefaults: Record<string, string>;
  overrides: Record<string, string>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'balanced',
    name: '🎯 平衡（API）',
    description: '国际题材、中英混合，2 渠道兼顾质量与成本',
    channelCount: 2,
    estimatedCost100Chapters: '~$38',
    requirements: ['Anthropic API Key', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:api',
      lore: 'claude-sonnet-4-6:api',
      outline: 'claude-sonnet-4-6:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:api',
      'showrunner.decide': 'claude-opus-4-6:api',
      'writer.architect': 'claude-opus-4-6:api',
      'writer.main': 'claude-sonnet-4-6:api',
      'writer.final_revise': 'claude-sonnet-4-6:api',
      'critic.review': 'claude-sonnet-4-6:api',
    },
  },
  {
    id: 'chinese-optimized',
    name: '📖 中文优化',
    description: '针对中文网文，主要用 Qwen 系列',
    channelCount: 2,
    estimatedCost100Chapters: '~$15',
    requirements: ['Anthropic API Key', 'Alibaba Qwen API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:api',
      lore: 'qwen3-max:api',
      outline: 'qwen3-max:api',
      showrunner: 'qwen3.5-flash:api',
      writer: 'qwen3.5-flash:api',
      review: 'qwen3.5-flash:api',
      context: 'qwen3.5-flash:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:api',
      'showrunner.decide': 'claude-opus-4-6:api',
      'writer.architect': 'claude-opus-4-6:api',
      'writer.main': 'qwen3-max:api',
      'writer.final_revise': 'qwen3-max:api',
      'lore.style.generate': 'qwen3-max:api',
    },
  },
  {
    id: 'budget',
    name: '💰 极致性价比',
    description: '全部 DeepSeek V3.2，最低成本',
    channelCount: 1,
    estimatedCost100Chapters: '~$3',
    requirements: ['DeepSeek API Key'],
    categoryDefaults: {
      project: 'deepseek-chat:api',
      lore: 'deepseek-chat:api',
      outline: 'deepseek-chat:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {},
  },
  {
    id: 'top-performance',
    name: '🏆 榜首性能',
    description: 'Gemini 3.1 Pro 指挥 + Sonnet 质量门 + DeepSeek 执行',
    channelCount: 3,
    estimatedCost100Chapters: '~$45',
    requirements: ['Anthropic API Key', 'Google Gemini API Key', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'gemini-3.1-pro:api',
      lore: 'claude-sonnet-4-6:api',
      outline: 'claude-sonnet-4-6:api',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'gemini-3.1-pro:api',
      'showrunner.decide': 'gemini-3.1-pro:api',
      'writer.architect': 'gemini-3.1-pro:api',
      'writer.main': 'claude-sonnet-4-6:api',
      'writer.final_revise': 'claude-sonnet-4-6:api',
      'critic.review': 'claude-sonnet-4-6:api',
    },
  },
  {
    id: 'cli-only',
    name: '🎟 纯订阅党',
    description: '全部用本机 Claude CLI，$0 边际成本',
    channelCount: 1,
    estimatedCost100Chapters: '$0 边际',
    requirements: ['Claude Max 订阅', '本机 claude CLI'],
    categoryDefaults: {
      project: 'claude-opus-4-6:cli',
      lore: 'claude-sonnet-4-6:cli',
      outline: 'claude-sonnet-4-6:cli',
      showrunner: 'claude-haiku-4-5:cli',
      writer: 'claude-haiku-4-5:cli',
      review: 'claude-haiku-4-5:cli',
      context: 'claude-haiku-4-5:cli',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:cli',
      'showrunner.decide': 'claude-opus-4-6:cli',
      'writer.architect': 'claude-opus-4-6:cli',
      'writer.main': 'claude-sonnet-4-6:cli',
      'writer.final_revise': 'claude-sonnet-4-6:cli',
      'critic.review': 'claude-sonnet-4-6:cli',
    },
  },
  {
    id: 'cli-api-hybrid',
    name: '🔀 订阅+API 混合',
    description: 'Claude CLI 指挥 + DeepSeek API 执行',
    channelCount: 2,
    estimatedCost100Chapters: '~$3',
    requirements: ['Claude Max 订阅', '本机 claude CLI', 'DeepSeek API Key'],
    categoryDefaults: {
      project: 'claude-opus-4-6:cli',
      lore: 'claude-sonnet-4-6:cli',
      outline: 'claude-sonnet-4-6:cli',
      showrunner: 'deepseek-chat:api',
      writer: 'deepseek-chat:api',
      review: 'deepseek-chat:api',
      context: 'deepseek-chat:api',
    },
    overrides: {
      'outline.volume.plan': 'claude-opus-4-6:cli',
      'showrunner.decide': 'claude-opus-4-6:cli',
      'writer.architect': 'claude-opus-4-6:cli',
      'writer.main': 'claude-sonnet-4-6:cli',
      'writer.final_revise': 'claude-sonnet-4-6:cli',
      'critic.review': 'claude-sonnet-4-6:cli',
    },
  },
];

export function getPreset(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * 应用预设：清除现有 category defaults 和所有 operation overrides，
 * 然后写入预设的绑定关系。
 */
export function applyPreset(presetId: string): void {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);

  // 自愈：确保 ai_operations / model_targets 已填充（幂等）。
  // 防止 dev server 缓存旧 db 单例导致 seed 未跑而 FK 失败。
  const db = getDb();
  seedModelTargets(db);
  seedOperations(db);

  // 清除预设涉及的 category defaults
  for (const category of Object.keys(preset.categoryDefaults)) {
    clearCategoryDefault(category);
  }

  // 清除所有 operation overrides（全量替换）
  db.prepare('DELETE FROM operation_overrides').run();

  // 写入新的 category defaults
  for (const [category, targetId] of Object.entries(preset.categoryDefaults)) {
    setCategoryDefault(category, targetId);
  }

  // 写入新的 operation overrides
  for (const [operationId, targetId] of Object.entries(preset.overrides)) {
    setOperationOverride(operationId, targetId);
  }
}
