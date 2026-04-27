import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function updateCharacterPrompt(opts: {
  characterProfile: string
  chapterSummary: string
  chapterNumber: number
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.lore_updater,
    messages: [{
      role: 'user',
      content: [
        '## 角色档案（当前）',
        opts.characterProfile,
        '',
        '## 本章摘要',
        opts.chapterSummary,
        '',
        `请基于第${opts.chapterNumber}章内容更新角色档案中的 AUTO_MAINTAINED 区域。只更新标记范围内的内容，不修改人工设定区。`,
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.3 },
  }
}
