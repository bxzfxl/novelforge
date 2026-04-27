import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function finalRevisePrompt(opts: {
  draftContent: string
  allReviews: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.final_revise,
    messages: [{
      role: 'user',
      content: [
        '## 待修订稿件',
        opts.draftContent,
        '',
        '## 全部审查意见',
        opts.allReviews,
        '',
        '请进行最终修订，修正所有问题并确保达到出版标准。',
      ].join('\n'),
    }],
    config: { maxTokens: 16000, temperature: 0.3 },
  }
}
