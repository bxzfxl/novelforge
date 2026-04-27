import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function continuityPrompt(opts: {
  draftContent: string
  contextL0: string
  contextL1: string
  styleGuide: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.continuity,
    messages: [{
      role: 'user',
      content: [
        '## 全局上下文',
        opts.contextL0,
        '',
        '## 本卷上下文',
        opts.contextL1,
        '',
        '## 风格指南',
        opts.styleGuide,
        '',
        '## 当前章节正文',
        opts.draftContent,
        '',
        '请检查本章与已有内容的事实一致性、时间线、战力体系，指出矛盾点。',
      ].join('\n'),
    }],
    config: { maxTokens: 8000, temperature: 0.3 },
  }
}
