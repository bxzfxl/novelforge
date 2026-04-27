import { ipcMain } from 'electron'
import type { LoreCategory } from '@novelforge/shared'
import { FileStore } from '../store/file-store'
import { listLoreEntries } from '../db/queries/lore'
import { ctx } from './context'

export function registerLoreIpc(): void {
  ipcMain.handle('lore:list', async (_event, projectName: string, category?: LoreCategory) => {
    const db = ctx.databases.get(projectName)
    if (!db) return []
    return listLoreEntries(db, projectName, category)
  })

  ipcMain.handle('lore:get', async (_event, projectName: string, category: string, key: string) => {
    const fileStore = ctx.fileStores.get(projectName) ?? new FileStore(projectName)
    return fileStore.readLoreFile(category, key)
  })

  ipcMain.handle('lore:save', async (_event, projectName: string, entry: { category: string; key: string; content: string }) => {
    const fileStore = ctx.fileStores.get(projectName) ?? new FileStore(projectName)
    fileStore.writeLoreFile(entry.category, entry.key, entry.content)
    return { success: true }
  })
}
