import type { ChapterMeta, PromptTemplate } from '@novelforge/shared'
import { architectPrompt, mainWriterPrompt, criticPrompt, continuityPrompt, revisePrompt } from '@novelforge/prompts'
import type { AIClient } from '../ai/client'
import type { ModelManager } from '../ai/model-manager'
import type { FileStore } from '../store/file-store'
import type Database from 'better-sqlite3'

interface ChapterResult {
  structureDraft: string
  draftV1: string
  reviewNotes: string
  finalDraft: string
  totalTokens: number
  totalCostUsd: number
}

export class WritersRoom {
  constructor(
    private aiClient: AIClient,
    private modelManager: ModelManager,
    private fileStore: FileStore,
    private db: Database.Database
  ) {}

  private async callRole(
    role: string,
    prompt: PromptTemplate,
    abortSignal?: AbortSignal
  ): Promise<{ content: string; inputTokens: number; outputTokens: number; costUsd: number }> {
    const model = this.modelManager.getBinding(role)
    if (!model) throw new Error(`No model configured for role: ${role}`)
    return this.aiClient.generate(model, [
      { role: 'system', content: prompt.system },
      ...prompt.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ], {
      maxTokens: prompt.config.maxTokens,
      temperature: prompt.config.temperature,
      signal: abortSignal,
    })
  }

  async writeChapter(opts: {
    chapterBrief: string
    volumeOutline: string
    contextL0: string
    contextL1: string
    styleGuide: string
    chapterMeta: ChapterMeta
    signal?: AbortSignal
  }): Promise<ChapterResult> {
    const { chapterBrief, volumeOutline, contextL0, contextL1, styleGuide, chapterMeta, signal } = opts

    // 1. Architect — design chapter structure
    const archPrompt = architectPrompt({ chapterBrief, volumeOutline, contextL0, contextL1, styleGuide })
    const structureResult = await this.callRole('architect', archPrompt, signal)
    this.fileStore.writeWorkspaceFile('structure-draft', structureResult.content)

    // 2. Main Writer — write first draft
    const writerPrompt = mainWriterPrompt({
      structureDraft: structureResult.content,
      chapterBrief,
      contextL0,
      contextL1,
      styleGuide,
      characters: chapterMeta.characters.join(', '),
    })
    const draftResult = await this.callRole('main_writer', writerPrompt, signal)
    this.fileStore.writeWorkspaceFile('draft-v1', draftResult.content)

    // 3. Parallel review: Critic + Continuity
    const criticPromptTemplate = criticPrompt({ draftContent: draftResult.content, chapterBrief })
    const continuityPromptTemplate = continuityPrompt({
      draftContent: draftResult.content,
      contextL0,
      contextL1,
      styleGuide,
    })

    const [criticResult, continuityResult] = await Promise.all([
      this.callRole('critic', criticPromptTemplate, signal),
      this.callRole('continuity', continuityPromptTemplate, signal),
    ])

    const reviewNotes = [
      '## 批评家意见',
      criticResult.content,
      '',
      '## 连续性审查',
      continuityResult.content,
    ].join('\n')
    this.fileStore.writeWorkspaceFile('review-notes', reviewNotes)

    // 4. Revise — merge feedback into final draft
    const revisePromptTemplate = revisePrompt({
      draftContent: draftResult.content,
      reviewNotes,
    })
    const finalResult = await this.callRole('revise', revisePromptTemplate, signal)
    this.fileStore.writeWorkspaceFile('draft-final', finalResult.content)

    // Calculate totals
    const totalTokens =
      structureResult.inputTokens + structureResult.outputTokens +
      draftResult.inputTokens + draftResult.outputTokens +
      criticResult.inputTokens + criticResult.outputTokens +
      continuityResult.inputTokens + continuityResult.outputTokens +
      finalResult.inputTokens + finalResult.outputTokens

    const totalCostUsd =
      structureResult.costUsd + draftResult.costUsd +
      criticResult.costUsd + continuityResult.costUsd +
      finalResult.costUsd

    return {
      structureDraft: structureResult.content,
      draftV1: draftResult.content,
      reviewNotes,
      finalDraft: finalResult.content,
      totalTokens,
      totalCostUsd,
    }
  }
}
