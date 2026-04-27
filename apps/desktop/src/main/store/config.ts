import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { AppSettings } from '@novelforge/shared'
import { DEFAULT_SETTINGS } from '@novelforge/shared'

const CONFIG_FILE = 'config.json'

export function getNovelForgeDir(): string {
  const home = app.getPath('home')
  return path.join(home, 'NovelForge')
}

export function getConfigPath(): string {
  return path.join(getNovelForgeDir(), CONFIG_FILE)
}

export function loadConfig(): AppSettings {
  const dir = getNovelForgeDir()
  fs.mkdirSync(dir, { recursive: true })

  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_SETTINGS, null, 2))
    return { ...DEFAULT_SETTINGS }
  }

  const raw = fs.readFileSync(configPath, 'utf-8')
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
}

export function saveConfig(config: AppSettings): void {
  const dir = getNovelForgeDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
}
