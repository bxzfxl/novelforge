import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function decidePrompt(opts: {
  projectState: string
  signals: string
  outline: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.showrunner,
    messages: [{
      role: 'user',
      content: [
        '## 项目状态',
        opts.projectState,
        '',
        '## 评估信号',
        opts.signals,
        '',
        '## 大纲',
        opts.outline,
        '',
        '请评估当前状态，决定下一步行动（继续/修订大纲/暂停检查/卷收尾），输出结构化决策。',
      ].join('\n'),
    }],
    config: { maxTokens: 4000, temperature: 0.4 },
  }
}
