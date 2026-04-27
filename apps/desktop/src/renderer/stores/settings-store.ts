import { create } from 'zustand'
import { api } from '@/lib/ipc-client'
import type { AppSettings } from '@novelforge/shared'

interface SettingsStoreState {
  settings: AppSettings | null
  loading: boolean
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  settings: null,
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const settings = await api.settings.get()
      set({ settings, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  update: async (partial) => {
    await api.settings.update(partial)
    set(s => ({
      settings: s.settings ? { ...s.settings, ...partial } : null,
    }))
  },
}))
