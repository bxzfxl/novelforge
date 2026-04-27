import { AIClient } from '../ai/client'
import { ModelManager } from '../ai/model-manager'
import type { FileStore } from '../store/file-store'
import type { PipelineEngine } from '../engine/pipeline'
import type { WritersRoom } from '../engine/writers-room'
import type { LoreEngine } from '../engine/lore-engine'
import type Database from 'better-sqlite3'

class IPCContext {
  aiClient = new AIClient()
  modelManager = new ModelManager()
  activePipeline: PipelineEngine | null = null
  fileStores = new Map<string, FileStore>()
  databases = new Map<string, Database.Database>()
}

export const ctx = new IPCContext()
