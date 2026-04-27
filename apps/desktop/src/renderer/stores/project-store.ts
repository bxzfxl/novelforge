import { create } from 'zustand'
import { api } from '@/lib/ipc-client'
import type { Project } from '@novelforge/shared'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  loadProjects: () => Promise<void>
  openProject: (id: string) => Promise<void>
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  closeProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    try {
      const projects = await api.project.list()
      set({ projects, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  openProject: async (id) => {
    const project = await api.project.open(id)
    set({ currentProject: project })
  },

  createProject: async (data) => {
    const project = await api.project.create(data)
    set(s => ({ projects: [project, ...s.projects] }))
    return project
  },

  deleteProject: async (id) => {
    await api.project.delete(id)
    set(s => ({
      projects: s.projects.filter(p => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }))
  },

  closeProject: () => set({ currentProject: null }),
}))
