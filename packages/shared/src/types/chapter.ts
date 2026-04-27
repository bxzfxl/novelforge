export interface ChapterMeta {
  id: string
  volumeId: string
  number: number
  title: string
  status: 'draft' | 'review' | 'final'
  wordCount: number
  targetWords: number
  pov: string
  characters: string[]
  locations: string[]
  events: string[]
  foreshadowPlanted: string[]
  foreshadowResolved: string[]
  aiModel: string
  aiTokens: number
  aiCostUsd: number
  createdAt: string
  revisedAt: string
}

export interface ChapterContent {
  meta: ChapterMeta
  body: string
}
