export interface Project {
  id: string
  name: string
  title: string
  author: string
  genre: string
  subGenre?: string
  targetWords: number
  synopsis: string
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: string
  projectId: string
  number: number
  title: string
  synopsis: string
  status: 'planned' | 'writing' | 'completed'
  targetChapters: number
}
