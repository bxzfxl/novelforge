import { create } from 'zustand'

interface EditorState {
  content: string
  wordCount: number
  chapterNumber: number
  volumeNumber: number
  showPreview: boolean
  isDirty: boolean
  setContent: (content: string) => void
  setShowPreview: (show: boolean) => void
  setChapter: (volume: number, chapter: number) => void
  markClean: () => void
  save: () => Promise<void>
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: '',
  wordCount: 0,
  chapterNumber: 1,
  volumeNumber: 1,
  showPreview: false,
  isDirty: false,

  setContent: (content) => {
    const chineseChars = (content.match(/[一-鿿]/g) || []).length
    set({ content, wordCount: chineseChars, isDirty: true })
  },

  setShowPreview: (show) => set({ showPreview: show }),

  setChapter: (volume, chapter) => set({
    volumeNumber: volume,
    chapterNumber: chapter,
    content: '',
    wordCount: 0,
    isDirty: false,
  }),

  markClean: () => set({ isDirty: false }),

  save: async () => {
    const { content, volumeNumber, chapterNumber } = get()
    const { api } = await import('@/lib/ipc-client')
    await api.chapter.save('default', volumeNumber, chapterNumber, {}, content)
    set({ isDirty: false })
  },
}))
