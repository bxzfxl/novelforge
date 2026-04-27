import { ipcMain, dialog } from 'electron'
import { FileStore } from '../store/file-store'
import { ctx } from './context'

export function registerNativeIpc(): void {
  ipcMain.handle('native:openDialog', async (_event, opts: { filters?: Array<{ name: string; extensions: string[] }> }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: opts.filters,
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('native:saveDialog', async (_event, opts: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
    const result = await dialog.showSaveDialog({
      defaultPath: opts.defaultPath,
      filters: opts.filters,
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('native:export', async (_event, projectName: string, format: string) => {
    // Basic export — returns path for future implementation
    const fileStore = ctx.fileStores.get(projectName) ?? new FileStore(projectName)
    return { status: 'pending', projectName, format }
  })

  ipcMain.handle('settings:get', async () => {
    const { loadConfig } = require('../store/config')
    return loadConfig()
  })

  ipcMain.handle('settings:update', async (_event, settings: any) => {
    const { saveConfig, loadConfig } = require('../store/config')
    const current = loadConfig()
    saveConfig({ ...current, ...settings })
    return loadConfig()
  })

  ipcMain.handle('settings:addModel', async (_event, model: any) => {
    ctx.modelManager.addModel(model)
    return ctx.modelManager.listModels()
  })

  ipcMain.handle('settings:removeModel', async (_event, id: string) => {
    ctx.modelManager.removeModel(id)
    return ctx.modelManager.listModels()
  })
}
