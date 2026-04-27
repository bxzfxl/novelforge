import { app, BrowserWindow } from 'electron'
import { WindowManager } from './window-manager'
import { registerProjectIpc } from './ipc/project.ipc'
import { registerChapterIpc } from './ipc/chapter.ipc'
import { registerLoreIpc } from './ipc/lore.ipc'
import { registerPipelineIpc } from './ipc/pipeline.ipc'
import { registerAiIpc } from './ipc/ai.ipc'
import { registerNativeIpc } from './ipc/native.ipc'

let windowManager: WindowManager

// Register all IPC handlers before app is ready
registerProjectIpc()
registerChapterIpc()
registerLoreIpc()
registerPipelineIpc()
registerAiIpc()
registerNativeIpc()

app.whenReady().then(() => {
  windowManager = new WindowManager()
  windowManager.createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow()
  }
})
