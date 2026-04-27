import { create } from 'zustand'
import { api } from '@/lib/ipc-client'
import type { PipelineState } from '@novelforge/shared'

interface PipelineStoreState {
  pipeline: PipelineState | null
  isRunning: boolean
  loadState: () => Promise<void>
  start: (projectName: string) => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
}

export const usePipelineStore = create<PipelineStoreState>((set) => ({
  pipeline: null,
  isRunning: false,

  loadState: async () => {
    const state = await api.pipeline.getState()
    set({ pipeline: state, isRunning: state?.status !== 'idle' && state?.status !== 'completed' })
  },

  start: async (projectName) => {
    const state = await api.pipeline.start(projectName)
    set({ pipeline: state, isRunning: true })
  },

  pause: async () => {
    const state = await api.pipeline.pause()
    set({ pipeline: state, isRunning: false })
  },

  stop: async () => {
    const state = await api.pipeline.stop()
    set({ pipeline: state, isRunning: false })
  },
}))
