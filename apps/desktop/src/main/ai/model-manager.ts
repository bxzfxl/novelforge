import type { ModelConfig, RoleModelBinding, AppSettings } from '@novelforge/shared'
import { createProvider } from './providers'
import { loadConfig, saveConfig } from '../store/config'

export class ModelManager {
  private config: AppSettings

  constructor() {
    this.config = loadConfig()
  }

  private reload(): void {
    this.config = loadConfig()
  }

  listModels(): ModelConfig[] {
    this.reload()
    return this.config.models.filter(m => m.enabled)
  }

  listAllModels(): ModelConfig[] {
    this.reload()
    return this.config.models
  }

  addModel(model: ModelConfig): void {
    this.reload()
    const idx = this.config.models.findIndex(m => m.id === model.id)
    if (idx >= 0) {
      this.config.models[idx] = model
    } else {
      this.config.models.push(model)
    }
    saveConfig(this.config)
  }

  removeModel(id: string): void {
    this.reload()
    this.config.models = this.config.models.filter(m => m.id !== id)
    // Clean up any role bindings pointing to this model
    this.config.roleBindings = this.config.roleBindings.filter(
      b => b.primaryModelId !== id && b.fallbackModelId !== id
    )
    saveConfig(this.config)
  }

  getModel(id: string): ModelConfig | undefined {
    this.reload()
    return this.config.models.find(m => m.id === id)
  }

  async testConnection(model: ModelConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      const provider = createProvider(model)
      return await provider.validate()
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  async fetchModelList(model: ModelConfig): Promise<string[]> {
    try {
      const provider = createProvider(model)
      const models = await provider.models()
      return models.map(m => m.id)
    } catch {
      return []
    }
  }

  getBinding(roleId: string): ModelConfig | undefined {
    this.reload()
    const binding = this.config.roleBindings.find(b => b.roleId === roleId)
    const modelId = binding?.primaryModelId ?? this.config.defaultFallbackModelId
    if (!modelId) return undefined
    return this.config.models.find(m => m.id === modelId && m.enabled)
  }

  getBindingForRole(roleId: string): RoleModelBinding | undefined {
    this.reload()
    return this.config.roleBindings.find(b => b.roleId === roleId)
  }

  setBinding(roleId: string, primaryModelId: string, fallbackModelId?: string): void {
    this.reload()
    const idx = this.config.roleBindings.findIndex(b => b.roleId === roleId)
    const binding: RoleModelBinding = { roleId, primaryModelId, fallbackModelId }
    if (idx >= 0) {
      this.config.roleBindings[idx] = binding
    } else {
      this.config.roleBindings.push(binding)
    }
    saveConfig(this.config)
  }

  removeBinding(roleId: string): void {
    this.reload()
    this.config.roleBindings = this.config.roleBindings.filter(b => b.roleId !== roleId)
    saveConfig(this.config)
  }

  setDefaultFallback(modelId: string): void {
    this.reload()
    this.config.defaultFallbackModelId = modelId
    saveConfig(this.config)
  }
}
