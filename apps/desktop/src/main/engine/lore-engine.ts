import type { ContextLayer } from '@novelforge/shared'
import { summaryPrompt, refreshContextPrompt } from '@novelforge/prompts'
import { v4 as uuid } from 'uuid'
import type { AIClient } from '../ai/client'
import type { ModelManager } from '../ai/model-manager'
import type { FileStore } from '../store/file-store'
import type Database from 'better-sqlite3'

interface AfterChapterResult {
  summary: string
  l2Content: string
  costUsd: number
}

export class LoreEngine {
  constructor(
    private aiClient: AIClient,
    private modelManager: ModelManager,
    private fileStore: FileStore,
    private db: Database
  ) {}

  async afterChapter(opts: {
    chapterContent: string
    chapterMeta: { number: number; volumeNumber: number; characters: string[] }
    existingL0: string
    existingL1: string
    recentChapterSummaries: string[]
    signal?: AbortSignal
  }): Promise<AfterChapterResult> {
    const model = this.modelManager.getBinding('summary')
    if (!model) throw new Error('No model configured for summary role')

    // Generate chapter summary
    const summaryPromptTemplate = summaryPrompt({ chapterContent: opts.chapterContent })
    const summaryResult = await this.aiClient.generate(model, [
      { role: 'system', content: summaryPromptTemplate.system },
      { role: 'user', content: summaryPromptTemplate.messages[0].content },
    ], {
      maxTokens: summaryPromptTemplate.config.maxTokens,
      temperature: summaryPromptTemplate.config.temperature,
      signal: opts.signal,
    })

    // Update L2 rolling window
    const newEntry = `Ch.${opts.chapterMeta.number}: ${summaryResult.content}`
    const l2Content = [...opts.recentChapterSummaries.slice(-4), newEntry].join('\n\n')

    // Refresh L0 (every 10 chapters) and L1 (every chapter)
    if (opts.chapterMeta.number % 10 === 0) {
      await this.refreshLayer('L0', opts.existingL0, summaryResult.content, opts.signal)
    }
    await this.refreshLayer('L1', opts.existingL1, summaryResult.content, opts.signal)

    // Store L2 in database
    this.upsertContextLayer('L2', l2Content, [opts.chapterMeta.number.toString()])

    return {
      summary: summaryResult.content,
      l2Content,
      costUsd: summaryResult.costUsd,
    }
  }

  private async refreshLayer(
    level: 'L0' | 'L1' | 'L2',
    existing: string,
    newContent: string,
    signal?: AbortSignal
  ): Promise<void> {
    const model = this.modelManager.getBinding('summary')
    if (!model) return

    const prompt = refreshContextPrompt({ type: level, existing, newContent })
    const result = await this.aiClient.generate(model, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.messages[0].content },
    ], {
      maxTokens: prompt.config.maxTokens,
      temperature: prompt.config.temperature,
      signal,
    })

    this.upsertContextLayer(level, result.content, [])
  }

  private upsertContextLayer(level: string, content: string, sourceIds: string[]): void {
    const existing = this.db.prepare(
      'SELECT id FROM context_layers WHERE level = ?'
    ).get(level) as { id: string } | undefined

    if (existing) {
      this.db.prepare(
        `UPDATE context_layers SET content = ?, source_chapter_ids = ?, generated_at = datetime('now') WHERE id = ?`
      ).run(content, JSON.stringify(sourceIds), existing.id)
    } else {
      this.db.prepare(
        'INSERT INTO context_layers (id, project_id, level, content, source_chapter_ids) VALUES (?, ?, ?, ?, ?)'
      ).run(uuid(), '', level, content, JSON.stringify(sourceIds))
    }
  }

  getContextLayers(): { L0: string; L1: string; L2: string } {
    const L0 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L0') as { content: string } | undefined
    const L1 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L1') as { content: string } | undefined
    const L2 = this.db.prepare('SELECT content FROM context_layers WHERE level = ?').get('L2') as { content: string } | undefined
    return {
      L0: L0?.content ?? '',
      L1: L1?.content ?? '',
      L2: L2?.content ?? '',
    }
  }

  async updateCharacterProfiles(opts: {
    chapterSummary: string
    chapterNumber: number
    characterIds: string[]
    signal?: AbortSignal
  }): Promise<void> {
    const model = this.modelManager.getBinding('summary')
    if (!model) return

    for (const charId of opts.characterIds) {
      const profile = this.fileStore.readLoreFile('characters', charId)
      if (!profile) continue

      const { updateCharacterPrompt } = require('@novelforge/prompts')
      const prompt = updateCharacterPrompt({
        characterProfile: profile,
        chapterSummary: opts.chapterSummary,
        chapterNumber: opts.chapterNumber,
      })

      const result = await this.aiClient.generate(model, [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.messages[0].content },
      ], {
        maxTokens: prompt.config.maxTokens,
        temperature: prompt.config.temperature,
        signal: opts.signal,
      })

      this.fileStore.writeLoreFile('characters', charId, result.content)
    }
  }
}
