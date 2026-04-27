import type { ModelConfig, RoleModelBinding } from './ai'

export interface AppSettings {
  theme: 'dark' | 'light'
  language: 'zh-CN' | 'en'
  fontSize: number
  autoSaveIntervalMs: number
  models: ModelConfig[]
  roleBindings: RoleModelBinding[]
  defaultFallbackModelId?: string
  shortcuts: Record<string, string>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'zh-CN',
  fontSize: 16,
  autoSaveIntervalMs: 30000,
  models: [],
  roleBindings: [],
  shortcuts: {},
}
