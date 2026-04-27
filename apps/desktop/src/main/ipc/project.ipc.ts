import { ipcMain } from 'electron'
import { openDb, migrate, getDbPath } from '../db/connection'
import * as ProjectQueries from '../db/queries/projects'
import { FileStore } from '../store/file-store'
import { ctx } from './context'
import fs from 'fs'

export function registerProjectIpc(): void {
  ipcMain.handle('project:list', async () => {
    // List from filesystem + db — simplified: return from config dirs
    const { getNovelForgeDir } = require('../store/config')
    const projectsDir = getNovelForgeDir() + '/projects'
    if (!fs.existsSync(projectsDir)) return []
    const dirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    return dirs.map(name => ({ id: name, name, title: name }))
  })

  ipcMain.handle('project:create', async (_event, data: { name: string; title: string; author: string; genre: string; synopsis?: string }) => {
    const db = openDb(data.name)
    migrate(db)
    const project = ProjectQueries.createProject(db, {
      name: data.name,
      title: data.title,
      author: data.author,
      genre: data.genre,
      subGenre: undefined,
      targetWords: 0,
      synopsis: data.synopsis ?? '',
    })
    const fileStore = new FileStore(data.name)
    ctx.fileStores.set(data.name, fileStore)
    ctx.databases.set(data.name, db)
    return project
  })

  ipcMain.handle('project:open', async (_event, projectName: string) => {
    const db = openDb(projectName)
    const project = ProjectQueries.getProject(db, projectName)
    const fileStore = new FileStore(projectName)
    ctx.fileStores.set(projectName, fileStore)
    ctx.databases.set(projectName, db)
    return project ?? { id: projectName, name: projectName }
  })

  ipcMain.handle('project:delete', async (_event, projectName: string) => {
    const fileStore = ctx.fileStores.get(projectName)
    if (fileStore) fileStore.deleteProjectDir()
    ctx.fileStores.delete(projectName)
    ctx.databases.delete(projectName)
  })
}
