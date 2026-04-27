import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function generateSummaryPrompt(opts: {
  chapterContent: string
  chapterNumber: number
  volumeNumber: number
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.summary,
    messages: [{
      role: 'user',
      content: [
        `## 第${opts.volumeNumber}卷第${opts.chapterNumber}章`,
        '',
        opts.chapterContent,
        '',
        '请生成：1) 本章摘要（200字内）2) 出场角色列表 3) 关键事件 4) 伏笔操作 5) 新地点/新角色',
      ].join('\n'),
    }],
    config: { maxTokens: 2000, temperature: 0.3 },
  }
}
