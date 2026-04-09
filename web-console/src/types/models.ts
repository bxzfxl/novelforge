/**
 * 数据模型类型定义
 * 集中管理所有数据库实体的 TypeScript 接口，与 lib/db/queries.ts 中的查询返回类型保持一致
 */

/** CLI 进程记录 */
export interface ProcessRecord {
  id: string
  /** CLI 类型：claude 或 gemini */
  cli_type: 'claude' | 'gemini'
  /** 角色名称，如 showrunner / writer / reviewer */
  role: string
  /** 关联章节编号，null 表示非章节级任务 */
  chapter_number: number | null
  /** 进程状态：pending / starting / running / completed / failed / killed */
  status: string
  started_at: string
  completed_at: string | null
  exit_code: number | null
  input_tokens: number | null
  output_tokens: number | null
  /** 输出文件路径 */
  output_file: string | null
  error_message: string | null
}

/** 章节记录 */
export interface ChapterRecord {
  chapter_number: number
  volume: number
  title: string | null
  /** 章节类型，如 normal / arc_open / arc_close / volume_climax */
  chapter_type: string
  word_count: number | null
  /** 章节状态：pending / writing / review / done */
  status: string
}

/** 人类审阅检查点记录 */
export interface CheckpointRecord {
  id: string
  volume: number
  chapter_number: number
  /** 检查点状态：pending / approved / rejected */
  status: string
  created_at: string
}

/** Token 用量记录 */
export interface TokenUsageRecord {
  id?: number
  process_id: string
  cli_type: string
  model: string | null
  input_tokens: number
  output_tokens: number
  chapter_number: number | null
  role: string | null
  recorded_at?: string
}

/** 事件日志记录 */
export interface EventRecord {
  id: number
  type: string
  message: string
  /** JSON 序列化的附加详情 */
  details: string | null
  chapter_number: number | null
  timestamp: string
}
