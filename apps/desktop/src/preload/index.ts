import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('novelforge', {
  platform: process.platform,
  version: '0.1.0',

  project: {
    list: () => ipcRenderer.invoke('project:list'),
    create: (data: any) => ipcRenderer.invoke('project:create', data),
    open: (id: string) => ipcRenderer.invoke('project:open', id),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
  },

  chapter: {
    list: (projectName: string, volumeId: string) =>
      ipcRenderer.invoke('chapter:list', projectName, volumeId),
    get: (projectName: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:get', projectName, chapterId),
    getContent: (projectName: string, volumeNum: number, chapterNum: number) =>
      ipcRenderer.invoke('chapter:getContent', projectName, volumeNum, chapterNum),
    save: (projectName: string, volumeNum: number, chapterNum: number, meta: any, body: string) =>
      ipcRenderer.invoke('chapter:save', projectName, volumeNum, chapterNum, meta, body),
  },

  lore: {
    list: (projectName: string, category: string) =>
      ipcRenderer.invoke('lore:list', projectName, category),
    get: (projectName: string, category: string, key: string) =>
      ipcRenderer.invoke('lore:get', projectName, category, key),
    save: (projectName: string, entry: any) =>
      ipcRenderer.invoke('lore:save', projectName, entry),
  },

  pipeline: {
    start: (projectName: string) => ipcRenderer.invoke('pipeline:start', projectName),
    pause: () => ipcRenderer.invoke('pipeline:pause'),
    resume: () => ipcRenderer.invoke('pipeline:resume'),
    stop: () => ipcRenderer.invoke('pipeline:stop'),
    getState: () => ipcRenderer.invoke('pipeline:getState'),
  },

  ai: {
    testConnection: (modelConfig: any) =>
      ipcRenderer.invoke('ai:testConnection', modelConfig),
    fetchModels: (modelConfig: any) =>
      ipcRenderer.invoke('ai:fetchModels', modelConfig),
    assist: (modelConfigId: string, prompt: string, selectedText?: string) =>
      ipcRenderer.invoke('ai:assist', modelConfigId, prompt, selectedText),
    streamAssist: (modelConfigId: string, prompt: string, selectedText?: string) =>
      ipcRenderer.invoke('ai:streamAssist', modelConfigId, prompt, selectedText),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    addModel: (model: any) => ipcRenderer.invoke('settings:addModel', model),
    removeModel: (id: string) => ipcRenderer.invoke('settings:removeModel', id),
  },

  native: {
    showOpenDialog: (opts: any) => ipcRenderer.invoke('native:openDialog', opts),
    showSaveDialog: (opts: any) => ipcRenderer.invoke('native:saveDialog', opts),
    exportProject: (projectName: string, format: string) =>
      ipcRenderer.invoke('native:export', projectName, format),
  },
})
