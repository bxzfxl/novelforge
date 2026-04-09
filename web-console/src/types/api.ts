/**
 * API 请求/响应类型定义
 * 统一前后端通信契约
 */

/** 标准成功响应包装 */
export interface ApiResponse<T> {
  data: T
}

/** 标准错误响应 */
export interface ApiError {
  error: string
  /** 业务错误码，与 AppError.code 对应 */
  code: string
}

/** 流水线信号状态 */
export interface PipelineSignals {
  /** 情节偏离检测结果 */
  plot_deviation: string
  /** 一致性警告数量 */
  consistency_warnings: number
  /** 各章节节奏评分 */
  pacing_scores: number[]
  /** 未兑现的伏笔列表 */
  foreshadow_debt: string[]
  /** 是否需要触发检查点 */
  checkpoint_due: boolean
  /** 下一个检查点章节号 */
  next_checkpoint: number
}

/** 流水线整体运行状态 */
export interface PipelineState {
  /** 项目名称 */
  project: string
  /** 当前卷号 */
  current_volume: number
  /** 当前章节号 */
  current_chapter: number
  /** 已完成总章节数 */
  total_chapters_written: number
  /** 已写总字数 */
  total_words: number
  /** 上一次执行的动作名称 */
  last_action: string
  /** 上一次执行动作的结果状态 */
  last_action_status: string
  signals: PipelineSignals
  /** Token 用量统计 */
  token_usage: {
    /** 本次会话消耗 */
    this_session: number
    /** 累计总消耗 */
    total: number
  }
}
