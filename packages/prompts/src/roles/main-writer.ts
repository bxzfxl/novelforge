import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function mainWriterPrompt(opts: {
  structureDraft: string
  chapterBrief: string
  contextL0: string
  contextL1: string
  styleGuide: string
  characters: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.main_writer,
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
        '## 本卷上下文',
        opts.contextL1,
        '',
        '## 风格指南',
        opts.styleGuide,
        '',
        '## 相关角色',
        opts.characters,
        '',
        '请根据以上材料撰写本章正文（3000字左右，Markdown格式）。',
      ].join('\n'),
    }],
    config: { maxTokens: 16000, temperature: 0.8 },
  }
}
