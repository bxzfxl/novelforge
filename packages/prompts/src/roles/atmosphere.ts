import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function atmospherePrompt(opts: {
  draftContent: string
  styleGuide: string
  chapterBrief: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.atmosphere,
    messages: [{
      role: 'user',
      content: [
        '## 章节任务书',
        opts.chapterBrief,
        '',
        '## 风格指南',
        opts.styleGuide,
        '',
        '## 当前章节正文',
        opts.draftContent,
        '',
        '请审视本章的环境描写、情感基调、文风一致性，提出改进建议。',
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.4 },
  }
}
