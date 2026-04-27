import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function createBriefPrompt(opts: {
  outline: string
  chapterNumber: number
  volumeNumber: number
  contextL0: string
  contextL1: string
  foreshadowDebt: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.showrunner,
    messages: [{
      role: 'user',
      content: [
        `## 第${opts.volumeNumber}卷第${opts.chapterNumber}章任务书生成`,
        '',
        '## 大纲',
        opts.outline,
        '',
        '## 全局上下文',
        opts.contextL0,
        '',
        '## 本卷上下文',
        opts.contextL1,
        '',
        '## 待回收伏笔',
        opts.foreshadowDebt,
        '',
        '请生成本章的详细任务书（chapter-brief），包含：key_events、characters_involved、foreshadow_actions、tone、constraints、context_load。',
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.5 },
  }
}
