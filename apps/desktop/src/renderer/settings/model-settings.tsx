import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Wifi, Loader2 } from 'lucide-react'
import { AddModelDialog } from './add-model-dialog'
import { RoleBinding } from './role-binding'
import { GeneralSettings } from './general-settings'
import { api } from '@/lib/ipc-client'
import type { ModelConfig } from '@novelforge/shared'

interface ModelSettingsPageProps {
  onBack?: () => void
}

export function ModelSettingsPage({ onBack }: ModelSettingsPageProps) {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  useEffect(() => { loadModels() }, [])

  const loadModels = async () => {
    const settings = await api.settings.get()
    setModels(settings.models || [])
  }

  const handleTest = async (model: ModelConfig) => {
    setTestingId(model.id)
    const result = await api.ai.testConnection(model)
    alert(result.valid ? '连接成功' : `连接失败: ${result.error}`)
    setTestingId(null)
  }

  const handleDelete = async (id: string) => {
    await api.settings.removeModel(id)
    await loadModels()
  }

  const handleAdd = async (model: ModelConfig) => {
    await api.settings.addModel(model)
    setShowAdd(false)
    await loadModels()
  }

  return (
    <div className="h-screen flex flex-col bg-nf-bg text-nf-text">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-nf-border bg-white">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>← 返回</Button>
        )}
        <h1 className="text-lg font-semibold text-nf-text">设置</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="models" className="max-w-3xl mx-auto">
          <TabsList className="mb-6">
            <TabsTrigger value="models">AI 模型</TabsTrigger>
            <TabsTrigger value="bindings">角色绑定</TabsTrigger>
            <TabsTrigger value="general">通用</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-nf-muted">
                配置 AI 模型后，可在角色绑定中分配。支持 Anthropic / Google / OpenAI / OpenAI-Compatible / Custom。
              </p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} className="mr-1" /> 添加模型
              </Button>
            </div>

            {models.length === 0 ? (
              <div className="text-center py-16 text-nf-muted-light">
                <p className="text-base mb-2 font-medium text-nf-muted">暂无模型</p>
                <p className="text-sm">点击"添加模型"配置第一个 AI 模型</p>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map(model => (
                  <div key={model.id} className="flex items-center gap-4 p-4 bg-white border border-nf-border rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-nf-text">{model.displayName}</span>
                        <Badge variant="outline" className="text-[10px]">{model.provider}</Badge>
                        {!model.enabled && <Badge variant="secondary" className="text-[10px]">已禁用</Badge>}
                      </div>
                      <div className="text-xs text-nf-muted-light mt-0.5 truncate">{model.modelId}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(model)}
                      disabled={testingId === model.id}
                    >
                      {testingId === model.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Wifi size={14} />
                      )}
                      <span className="ml-1 text-xs">测试</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(model.id)}>
                      <Trash2 size={14} className="text-nf-muted-light hover:text-[var(--color-nf-red)]" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bindings">
            <RoleBinding />
          </TabsContent>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>
        </Tabs>
      </div>

      {showAdd && <AddModelDialog onSave={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
