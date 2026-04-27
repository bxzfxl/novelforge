import { describe, it, expect, vi, afterAll } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'

// Mock electron before any imports — vitest hoists this
vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
}))

import { FileStore } from '@/main/store/file-store'

const testProjectsRoot = path.join(os.tmpdir(), 'NovelForge', 'projects')

afterAll(() => {
  if (fs.existsSync(testProjectsRoot)) {
    fs.rmSync(testProjectsRoot, { recursive: true, force: true })
  }
})

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe('FileStore', () => {
  it('should be constructable', () => {
    const store = new FileStore(`construct-${uid()}`)
    expect(store).toBeDefined()
  })

  it('exists() should return false for a new project', () => {
    const store = new FileStore(`nonexistent-${uid()}`)
    expect(store.exists()).toBe(false)
  })

  it('should write and read lore files', () => {
    const store = new FileStore(`lore-${uid()}`)
    store.writeLoreFile('characters', 'hero', 'Hero character description')
    const content = store.readLoreFile('characters', 'hero')
    expect(content).toBe('Hero character description')
  })

  it('should return empty string for non-existent lore file', () => {
    const store = new FileStore(`lore-none-${uid()}`)
    expect(store.readLoreFile('characters', 'nonexistent')).toBe('')
  })

  it('should write and read chapter content with frontmatter', () => {
    const store = new FileStore(`chapter-${uid()}`)
    store.writeChapterContent(1, 1, { title: 'Chapter 1', wordCount: 1000 }, 'Once upon a time...')
    const result = store.readChapterContent(1, 1)
    expect(result.meta.title).toBe('Chapter 1')
    expect(result.meta.wordCount).toBe(1000)
    expect(result.body).toContain('Once upon a time...')
  })

  it('should return empty chapter for non-existent chapter', () => {
    const store = new FileStore(`empty-ch-${uid()}`)
    const result = store.readChapterContent(99, 99)
    expect(result.meta).toEqual({})
    expect(result.body).toBe('')
  })

  it('should list chapter files in order', () => {
    const store = new FileStore(`list-ch-${uid()}`)
    store.writeChapterContent(1, 2, {}, 'Content 2')
    store.writeChapterContent(1, 1, {}, 'Content 1')
    store.writeChapterContent(1, 3, {}, 'Content 3')
    const chapters = store.listChapterFiles(1)
    expect(chapters).toEqual([1, 2, 3])
  })

  it('should return empty list for non-existent volume', () => {
    const store = new FileStore(`no-vol-${uid()}`)
    expect(store.listChapterFiles(99)).toEqual([])
  })

  it('should write and read outline files', () => {
    const store = new FileStore(`outline-${uid()}`)
    store.writeOutlineFile('volume-1-outline', 'Outline content for volume 1')
    expect(store.readOutlineFile('volume-1-outline')).toBe('Outline content for volume 1')
  })

  it('should return empty string for non-existent outline', () => {
    const store = new FileStore(`outline-none-${uid()}`)
    expect(store.readOutlineFile('nonexistent')).toBe('')
  })

  it('should write and read workspace files', () => {
    const store = new FileStore(`ws-${uid()}`)
    store.writeWorkspaceFile('session-notes', 'Current session notes')
    expect(store.readWorkspaceFile('session-notes')).toBe('Current session notes')
  })

  it('deleteProjectDir should remove project directory', () => {
    const store = new FileStore(`delete-${uid()}`)
    store.writeLoreFile('world', 'test', 'test content')
    expect(store.exists()).toBe(true)
    store.deleteProjectDir()
    expect(store.exists()).toBe(false)
  })

  it('deleteProjectDir should not throw for non-existent project', () => {
    const store = new FileStore(`delete-none-${uid()}`)
    expect(() => store.deleteProjectDir()).not.toThrow()
  })
})
