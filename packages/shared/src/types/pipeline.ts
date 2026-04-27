export type PipelinePhase =
  | 'idle' | 'planning' | 'writing' | 'lore_updating'
  | 'checkpoint' | 'paused' | 'error' | 'completed'

export type WriterRole =
  | 'showrunner' | 'architect' | 'main_writer' | 'character_advocate'
  | 'atmosphere' | 'critic' | 'continuity' | 'revise' | 'summary'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PipelineStep {
  id: string
  role: WriterRole
  status: StepStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  modelUsed?: string
  tokensUsed?: number
  costUsd?: number
  error?: string
}

export interface PipelineState {
  id: string
  projectId: string
  status: PipelinePhase
  phase: PipelinePhase
  currentChapterId?: string
  currentVolumeId?: string
  steps: PipelineStep[]
  totalChapters: number
  completedChapters: number
  totalTokens: number
  totalCostUsd: number
  startedAt?: string
}
