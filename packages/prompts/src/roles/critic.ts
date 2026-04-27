import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function criticPrompt(opts: {
  draftContent: string
  chapterBrief: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.critic,
    messages: [{
      role: 'user',
      content: [
        '## 章节任务书',
        opts.chapterBrief,
        '',
        '## 当前章节正文',
        opts.draftContent,
        '',
        '请以读者视角评估本章的趣味性、可读性、节奏感，指出问题。',
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.5 },
  }
}
