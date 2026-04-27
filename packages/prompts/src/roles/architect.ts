import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function architectPrompt(opts: {
  chapterBrief: string
  volumeOutline: string
  contextL0: string
  contextL1: string
  styleGuide: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.architect,
    messages: [{
      role: 'user',
      content: [
        '## 章节任务书',
        opts.chapterBrief,
        '',
        '## 本卷大纲',
        opts.volumeOutline,
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
        '请输出本章的结构稿（包含场景划分、节奏曲线、视角标注）。',
      ].join('\n'),
    }],
    config: { maxTokens: 8000, temperature: 0.6 },
  }
}
