import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('novelforge', {
  platform: process.platform,
  version: '0.1.0',
})
