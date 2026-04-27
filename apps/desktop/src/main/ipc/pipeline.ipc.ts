import { ipcMain } from 'electron'
import { PipelineEngine } from '../engine/pipeline'
import { ctx } from './context'

export function registerPipelineIpc(): void {
  ipcMain.handle('pipeline:start', async (_event, projectName: string) => {
    ctx.activePipeline = new PipelineEngine(projectName, 100)
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

  // Forward events from pipeline engine to renderer
  if (ctx.activePipeline) {
    ctx.activePipeline.on('phase:enter', (data) => {
      // Events handled via webContents.send in main process
    })
  }
}
