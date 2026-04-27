import { ipcMain } from 'electron'
import { FileStore } from '../store/file-store'
import { ctx } from './context'

export function registerChapterIpc(): void {
  ipcMain.handle('chapter:list', async (_event, projectName: string, volumeId: string) => {
    const db = ctx.databases.get(projectName)
    if (!db) return []
    const { listChapters } = require('../db/queries/chapters')
    return listChapters(db, volumeId)
  })

  ipcMain.handle('chapter:get', async (_event, projectName: string, chapterId: string) => {
    const db = ctx.databases.get(projectName)
    if (!db) return undefined
    const { getChapter } = require('../db/queries/chapters')
    return getChapter(db, chapterId)
  })

  ipcMain.handle('chapter:getContent', async (_event, projectName: string, volumeNum: number, chapterNum: number) => {
    const fileStore = ctx.fileStores.get(projectName) ?? new FileStore(projectName)
    return fileStore.readChapterContent(volumeNum, chapterNum)
  })

  ipcMain.handle('chapter:save', async (_event, projectName: string, volumeNum: number, chapterNum: number, meta: any, body: string) => {
    const fileStore = ctx.fileStores.get(projectName) ?? new FileStore(projectName)
    fileStore.writeChapterContent(volumeNum, chapterNum, meta, body)
    return { success: true }
  })
}
