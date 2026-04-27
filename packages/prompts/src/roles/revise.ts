import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function revisePrompt(opts: {
  draftContent: string
  reviewNotes: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.revise,
    messages: [{
      role: 'user',
      content: [
        '## 初稿',
        opts.draftContent,
        '',
        '## 审查意见',
        opts.reviewNotes,
        '',
        '请根据审查意见修订初稿，保持原有文风，只修改有问题的地方。',
      ].join('\n'),
    }],
    config: { maxTokens: 16000, temperature: 0.5 },
  }
}
