import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function mergeBestPrompt(opts: {
  draftA: string
  draftB: string
  compareResult: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.merge_best,
    messages: [{
      role: 'user',
      content: [
        '## 竞稿 A',
        opts.draftA,
        '',
        '## 竞稿 B',
        opts.draftB,
        '',
        '## 盲评结果',
        opts.compareResult,
        '',
        '请以优胜稿为基础，合并落选稿中的优秀片段，输出优化后的正文。',
      ].join('\n'),
    }],
    config: { maxTokens: 16000, temperature: 0.5 },
  }
}
