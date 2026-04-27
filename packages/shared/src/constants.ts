export const WRITER_ROLES = [
  'showrunner', 'architect', 'main_writer', 'character_advocate',
  'atmosphere', 'critic', 'continuity', 'revise', 'summary',
] as const

export const PIPELINE_PHASES = [
  'idle', 'planning', 'writing', 'lore_updating', 'checkpoint',
  'paused', 'error', 'completed',
] as const

export const PROVIDER_TYPES = [
  'anthropic', 'google', 'openai', 'openai-compatible', 'custom',
] as const

export const LORE_CATEGORIES = ['world', 'characters', 'style'] as const

export const DEFAULT_TARGET_WORDS = 1_000_000
export const DEFAULT_CHAPTER_WORDS = 3000
export const DEFAULT_MAX_TOKENS = 16000
export const NOVELFORGE_VERSION = '0.1.0'
