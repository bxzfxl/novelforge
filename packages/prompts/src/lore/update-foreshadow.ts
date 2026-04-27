import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function updateForeshadowPrompt(opts: {
  foreshadowRegister: string
  chapterContent: string
  chapterNumber: number
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.lore_updater,
    messages: [{
      role: 'user',
      content: [
        '## 伏笔登记簿（当前）',
        opts.foreshadowRegister,
        '',
        '## 本章正文',
        opts.chapterContent,
        '',
        `请基于第${opts.chapterNumber}章更新伏笔登记簿：标记已回收的伏笔为 resolved，登记新埋设的伏笔为 planted。`,
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.3 },
  }
}
