import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function refreshContextPrompt(opts: {
  type: 'L0' | 'L1' | 'L2'
  existing: string
  newContent: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.summary,
    messages: [{
      role: 'user',
      content: [
        `## 当前${opts.type}上下文`,
        opts.existing,
        '',
        '## 新增内容',
        opts.newContent,
        '',
        `请基于以上内容刷新${opts.type}上下文层，保持简洁，去除冗余信息。`,
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.3 },
  }
}
