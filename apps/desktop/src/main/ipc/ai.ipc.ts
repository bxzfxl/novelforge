import { ipcMain } from 'electron'
import type { ModelConfig } from '@novelforge/shared'
import { ctx } from './context'

export function registerAiIpc(): void {
  ipcMain.handle('ai:testConnection', async (_event, modelConfig: ModelConfig) => {
    return ctx.modelManager.testConnection(modelConfig)
  })

  ipcMain.handle('ai:fetchModels', async (_event, modelConfig: ModelConfig) => {
    return ctx.modelManager.fetchModelList(modelConfig)
  })

  ipcMain.handle('ai:assist', async (_event, modelConfigId: string, prompt: string, selectedText?: string) => {
    const model = ctx.modelManager.getModel(modelConfigId)
    if (!model) throw new Error(`Model not found: ${modelConfigId}`)
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: '你是一位写作助手。帮助用户完成写作任务，只输出结果不要解释。' },
      { role: 'user', content: selectedText ? `${prompt}\n\n选中文本：\n${selectedText}` : prompt },
    ]
    return ctx.aiClient.generate(model, messages)
  })

  ipcMain.handle('ai:streamAssist', async (_event, modelConfigId: string, prompt: string, selectedText?: string) => {
    // Streaming not supportable via ipcMain.handle (returns once)
    // Renderer will receive content via webContents.send
    return { note: 'Stream not available via invoke. Use pipeline events instead.' }
  })
}
