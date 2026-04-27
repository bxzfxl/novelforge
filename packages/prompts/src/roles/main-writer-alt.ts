import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function mainWriterAltPrompt(opts: {
  structureDraft: string
  chapterBrief: string
  contextL0: string
  styleGuide: string
  characters: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.main_writer_alt,
    messages: [{
      role: 'user',
      content: [
        '## 章节任务书',
        opts.chapterBrief,
        '',
        '## 结构稿',
        opts.structureDraft,
        '',
        '## 全局上下文',
        opts.contextL0,
        '',
        '## 风格指南',
        opts.styleGuide,
        '',
        '## 相关角色',
        opts.characters,
        '',
        '请用与常规风格不同的叙事手法撰写本章正文（3000字左右）。',
      ].join('\n'),
    }],
    config: { maxTokens: 16000, temperature: 0.9 },
  }
}
