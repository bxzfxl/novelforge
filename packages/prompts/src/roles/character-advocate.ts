import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function characterAdvocatePrompt(opts: {
  characterName: string
  characterProfile: string
  draftContent: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.character_advocate,
    messages: [{
      role: 'user',
      content: [
        `## 角色：${opts.characterName}`,
        '',
        '## 角色档案',
        opts.characterProfile,
        '',
        '## 当前章节正文',
        opts.draftContent,
        '',
        `请以${opts.characterName}的视角审视本章，检查行为、对话是否符合人设，提出修改建议。`,
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.4 },
  }
}
