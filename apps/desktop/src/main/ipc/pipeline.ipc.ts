import { ipcMain, BrowserWindow } from 'electron'
import { PipelineEngine } from '../engine/pipeline'
import { ctx } from './context'

export function registerPipelineIpc(): void {
  ipcMain.handle('pipeline:start', async (event, projectName: string) => {
    // Detach old pipeline events before creating new one
    if (ctx.activePipeline) {
      ctx.activePipeline.removeAllListeners()
    }
    ctx.activePipeline = new PipelineEngine(projectName, 100)

    // Forward engine events to the renderer that started it
    const sender = event.sender
    const win = BrowserWindow.fromWebContents(sender)
    if (win) {
      ctx.activePipeline.on('phase:enter', (data) => {
        win.webContents.send('pipeline:phaseChange', data)
      })
      ctx.activePipeline.on('step:complete', (data) => {
        win.webContents.send('pipeline:stepComplete', data)
      })
    }

    ctx.activePipeline.start()
    return ctx.activePipeline.toJSON()
  })

  ipcMain.handle('pipeline:pause', async () => {
    ctx.activePipeline?.pause()
    return ctx.activePipeline?.toJSON() ?? null
  })

  ipcMain.handle('pipeline:resume', async () => {
    ctx.activePipeline?.resume()
    return ctx.activePipeline?.toJSON() ?? null
  })

  ipcMain.handle('pipeline:stop', async () => {
    if (ctx.activePipeline) {
      ctx.activePipeline.pause()
    }
    return ctx.activePipeline?.toJSON() ?? null
  })

  ipcMain.handle('pipeline:getState', async () => {
    return ctx.activePipeline?.toJSON() ?? null
  })
}
