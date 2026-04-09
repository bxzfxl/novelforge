/**
 * 统一错误体系
 * 提供类型安全的错误处理与 Result 模式
 */

/** 应用层统一错误类 */
export class AppError {
  constructor(
    /** 业务错误码，如 'PROCESS_NOT_FOUND' */
    public code: string,
    /** 用户可读的错误描述 */
    public message: string,
    /** HTTP 状态码，默认 500 */
    public statusCode: number = 500,
  ) {}
}

/** Result 类型：成功或失败的联合类型，避免 try/catch 散落 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

/** 构造成功结果 */
export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

/** 构造失败结果 */
export const err = (error: AppError): Result<never> => ({ ok: false, error })
