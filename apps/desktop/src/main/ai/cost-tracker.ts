import { v4 as uuid } from 'uuid'
import type { AICallLog, ChatResult } from '@novelforge/shared'

export class CostTracker {
  private logs: AICallLog[] = []

  record(result: ChatResult, modelId: string, provider: string, role: string, pipelineRunId?: string, durationMs?: number): void {
    this.logs.push({
      id: uuid(),
      pipelineRunId,
      role,
      modelId,
      provider: provider as any,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
      durationMs: durationMs ?? result.durationMs,
      status: 'success',
      createdAt: new Date().toISOString(),
    })
  }

  recordError(modelId: string, provider: string, role: string, error: string): void {
    this.logs.push({
      id: uuid(),
      role,
      modelId,
      provider: provider as any,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: 0,
      status: 'error',
      error,
      createdAt: new Date().toISOString(),
    })
  }

  getLogs(): AICallLog[] { return [...this.logs] }

  getTotalCost(): number {
    return this.logs.reduce((sum, l) => sum + l.costUsd, 0)
  }

  getTotalTokens(): { input: number; output: number } {
    return this.logs.reduce(
      (acc, l) => ({ input: acc.input + l.inputTokens, output: acc.output + l.outputTokens }),
      { input: 0, output: 0 }
    )
  }

  clear(): void { this.logs = [] }
}
