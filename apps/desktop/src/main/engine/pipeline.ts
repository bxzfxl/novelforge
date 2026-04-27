import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import type { PipelineState, PipelinePhase, PipelineStep, WriterRole } from '@novelforge/shared'

export class PipelineEngine extends EventEmitter {
  state: PipelineState

  constructor(projectId: string, totalChapters: number) {
    super()
    this.state = {
      id: uuid(),
      projectId,
      status: 'idle',
      phase: 'idle',
      steps: [],
      totalChapters,
      completedChapters: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    }
  }

  private transition(phase: PipelinePhase): void {
    this.state.phase = phase
    this.state.status = phase
    this.emit('phase:enter', { phase, timestamp: Date.now() })
  }

  start(): void {
    this.transition('planning')
  }

  beginWriting(): void {
    this.transition('writing')
  }

  beginLoreUpdate(): void {
    this.transition('lore_updating')
  }

  beginCheckpoint(): void {
    this.transition('checkpoint')
  }

  pause(): void {
    this.transition('paused')
  }

  resume(): void {
    this.transition('writing')
  }

  private addStep(role: WriterRole): string {
    const id = uuid()
    this.state.steps.push({ id, role, status: 'pending' })
    return id
  }

  private updateStep(id: string, update: Partial<PipelineStep>): void {
    const step = this.state.steps.find(s => s.id === id)
    if (step) Object.assign(step, update)
  }

  async executeStep(
    role: WriterRole,
    fn: () => Promise<{ tokensUsed: number; costUsd: number }>
  ): Promise<void> {
    const id = this.addStep(role)
    this.updateStep(id, { status: 'running', startedAt: new Date().toISOString() })
    this.emit('step:start', { id, role })

    try {
      const result = await fn()
      this.state.totalTokens += result.tokensUsed
      this.state.totalCostUsd += result.costUsd
      this.updateStep(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
      })
      this.emit('step:complete', { id, role, ...result })
    } catch (e: any) {
      this.updateStep(id, { status: 'failed', error: e.message })
      this.transition('error')
      this.emit('error', { id, role, error: e.message })
      throw e
    }
  }

  completeChapter(): void {
    this.state.completedChapters++
    if (this.state.completedChapters >= this.state.totalChapters) {
      this.transition('completed')
    }
  }

  getProgress(): { percent: number; estimatedRemainingMs: number } {
    const percent = this.state.totalChapters > 0
      ? Math.round((this.state.completedChapters / this.state.totalChapters) * 100)
      : 0
    const avgMsPerChapter = 600_000
    const remaining = (this.state.totalChapters - this.state.completedChapters) * avgMsPerChapter
    return { percent, estimatedRemainingMs: remaining }
  }

  setCurrentChapter(volumeId: string, chapterId: string): void {
    this.state.currentVolumeId = volumeId
    this.state.currentChapterId = chapterId
  }

  toJSON(): PipelineState {
    return { ...this.state }
  }
}
