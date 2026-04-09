/**
 * Socket.IO 事件类型定义
 * 统一 Web 控制台与 Remote Agent 之间的 WebSocket 通信契约
 */

import type { ProcessRecord } from './models'

/** 服务端 → 客户端事件映射 */
export interface ServerToClientEvents {
  /** 进程终端输出流 */
  'process:output': (data: { processId: string; data: string }) => void
  /** 进程状态变更通知 */
  'process:status': (data: ProcessRecord) => void
  /** 文件系统变更通知（手稿/大纲/资料等） */
  'file:changed': (data: { path: string; type: 'created' | 'modified' | 'deleted' }) => void
  /** 系统级告警（情节偏离、一致性问题、需人工介入等） */
  alert: (data: { level: 'info' | 'warning' | 'error'; message: string }) => void
  /** 流水线状态全量推送（定期心跳或关键节点触发） */
  'pipeline:state': (data: import('./api').PipelineState) => void
  /** 检查点触发，需人工审阅 */
  'checkpoint:ready': (data: { checkpointId: string; chapterNumber: number }) => void
}

/** 客户端 → 服务端事件映射 */
export interface ClientToServerEvents {
  /** 订阅指定进程的输出流 */
  'process:subscribe': (processId: string) => void
  /** 取消订阅进程输出流 */
  'process:unsubscribe': (processId: string) => void
  /** 向进程发送输入（如交互式确认） */
  'process:input': (data: { processId: string; input: string }) => void
  /** 强制终止进程 */
  'process:kill': (processId: string) => void
  /** 审阅检查点：批准或拒绝 */
  'checkpoint:review': (data: { checkpointId: string; approved: boolean; notes?: string }) => void
}

/** 服务端内部事件（多房间广播等，可选） */
export interface InterServerEvents {
  ping: () => void
}

/** 每个 Socket 连接的自定义数据（attach 到 socket.data） */
export interface SocketData {
  /** 已订阅的进程 ID 集合 */
  subscribedProcesses: Set<string>
}
