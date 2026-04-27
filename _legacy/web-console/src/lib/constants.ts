/**
 * 全局常量
 * 统一管理业务配置上限、默认值与 UI 展示映射
 */

/** 同时运行的 Claude CLI 进程上限 */
export const MAX_CONCURRENT_CLAUDE = 3

/** 同时运行的 Gemini CLI 进程上限 */
export const MAX_CONCURRENT_GEMINI = 2

/** Remote Agent 默认服务地址 */
export const DEFAULT_AGENT_URL = 'http://localhost:9100'

/** 默认每章最少字数 */
export const DEFAULT_CHAPTER_WORD_MIN = 4000

/** 默认每章最多字数 */
export const DEFAULT_CHAPTER_WORD_MAX = 5000

/** 默认触发检查点的章节间隔（每 N 章暂停等待人工审阅） */
export const DEFAULT_CHECKPOINT_INTERVAL = 10

/**
 * 进程状态 → Tailwind 文字颜色映射
 * 与 ProcessRecord.status 的枚举值保持对应
 */
export const STATUS_COLORS = {
  running: 'text-orange-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  starting: 'text-yellow-600',
  killed: 'text-gray-500',
  pending: 'text-gray-400',
} as const

/** STATUS_COLORS 的键类型 */
export type StatusColorKey = keyof typeof STATUS_COLORS
