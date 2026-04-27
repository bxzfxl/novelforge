import { app, BrowserWindow } from 'electron'
import { WindowManager } from './window-manager'

let windowManager: WindowManager

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
