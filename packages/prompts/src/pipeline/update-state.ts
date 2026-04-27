import type { PromptTemplate } from '@novelforge/shared'
import { SYSTEM_PROMPTS } from '../system-prompts'

export function updateStatePrompt(opts: {
  currentState: string
  chapterResult: string
  signals: string
}): PromptTemplate {
  return {
    system: SYSTEM_PROMPTS.showrunner,
    messages: [{
      role: 'user',
      content: [
        '## 当前管线状态',
        opts.currentState,
        '',
        '## 本章执行结果',
        opts.chapterResult,
        '',
        '## 信号评估',
        opts.signals,
        '',
        '请更新管线状态（pipeline-state.yaml），评估本章质量，更新信号指标。',
      ].join('\n'),
    }],
    config: { maxTokens: 2000, temperature: 0.3 },
  }
}
