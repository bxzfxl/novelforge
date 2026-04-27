import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function summaryPrompt(opts: {
  chapterContent: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.summary,
    messages: [{
      role: 'user',
      content: [
        '## 章节正文',
        opts.chapterContent,
        '',
        '请生成本章的简洁摘要（200字以内），并提取：出场角色、新地点、伏笔操作、重要事件。',
      ].join('\n'),
    }],
    config: { maxTokens: 2000, temperature: 0.3 },
  }
}
