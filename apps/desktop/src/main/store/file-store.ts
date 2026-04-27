import fs from 'fs'
import path from 'path'
import { getNovelForgeDir } from './config'

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue
    const k = line.slice(0, colonIdx).trim()
    const v = line.slice(colonIdx + 1).trim()
    try { meta[k] = JSON.parse(v) }
    catch { meta[k] = v }
  }
  return { meta, body: match[2].trimStart() }
}

export class FileStore {
  private projectDir: string

  constructor(projectName: string) {
    this.projectDir = path.join(getNovelForgeDir(), 'projects', projectName)
  }

  private ensureDir(...segments: string[]): string {
    const dir = path.join(this.projectDir, ...segments)
    fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  // --- Lore ---
  readLoreFile(category: string, key: string): string {
    const fp = path.join(this.projectDir, 'lore', category, `${key}.md`)
    if (!fs.existsSync(fp)) return ''
    return fs.readFileSync(fp, 'utf-8')
  }

  writeLoreFile(category: string, key: string, content: string): void {
    this.ensureDir('lore', category)
    fs.writeFileSync(path.join(this.projectDir, 'lore', category, `${key}.md`), content)
  }

  // --- Outline ---
  readOutlineFile(name: string): string {
    const fp = path.join(this.projectDir, 'outline', `${name}.md`)
    if (!fs.existsSync(fp)) return ''
    return fs.readFileSync(fp, 'utf-8')
  }

  writeOutlineFile(name: string, content: string): void {
    this.ensureDir('outline')
    fs.writeFileSync(path.join(this.projectDir, 'outline', `${name}.md`), content)
  }

  // --- Manuscript ---
  readChapterContent(volumeNum: number, chapterNum: number): { meta: Record<string, unknown>; body: string } {
    const dir = path.join(this.projectDir, 'manuscript', `vol-${volumeNum}`)
    const padded = String(chapterNum).padStart(3, '0')
    const fp = path.join(dir, `ch-${padded}.md`)
    if (!fs.existsSync(fp)) return { meta: {}, body: '' }
    return parseFrontmatter(fs.readFileSync(fp, 'utf-8'))
  }

  writeChapterContent(volumeNum: number, chapterNum: number, meta: Record<string, unknown>, body: string): void {
    this.ensureDir('manuscript', `vol-${volumeNum}`)
    const yamlLines = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')
    const content = `---\n${yamlLines}\n---\n\n${body}`
    const padded = String(chapterNum).padStart(3, '0')
    fs.writeFileSync(path.join(this.projectDir, 'manuscript', `vol-${volumeNum}`, `ch-${padded}.md`), content)
  }

  listChapterFiles(volumeNum: number): number[] {
    const dir = path.join(this.projectDir, 'manuscript', `vol-${volumeNum}`)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => /^ch-\d+\.md$/.test(f))
      .map(f => parseInt(f.match(/\d+/)![0]))
      .sort((a, b) => a - b)
  }

  // --- Workspace ---
  readWorkspaceFile(name: string): string {
    const fp = path.join(this.projectDir, 'workspace', 'current', `${name}.md`)
    if (!fs.existsSync(fp)) return ''
    return fs.readFileSync(fp, 'utf-8')
  }

  writeWorkspaceFile(name: string, content: string): void {
    this.ensureDir('workspace', 'current')
    fs.writeFileSync(path.join(this.projectDir, 'workspace', 'current', `${name}.md`), content)
  }

  // --- Project Management ---
  deleteProjectDir(): void {
    if (fs.existsSync(this.projectDir)) {
      fs.rmSync(this.projectDir, { recursive: true, force: true })
    }
  }

  exists(): boolean {
    return fs.existsSync(this.projectDir)
  }
}
