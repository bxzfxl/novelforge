import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/ipc-client'
import type { ModelConfig } from '@novelforge/shared'
import { WRITER_ROLES } from '@novelforge/shared'

const ROLE_LABELS: Record<string, string> = {
  architect: '故事架构师',
  main_writer: '主笔',
  main_writer_alt: '主笔(备选)',
  character_advocate: '角色代言人',
  atmosphere: '氛围渲染师',
  foreshadow_weaver: '伏笔编织者',
  critic: '批评家',
  continuity: '连续性审查员',
  revise: '修订编辑',
  summary: '内容摘要师',
}

export function RoleBinding() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [bindings, setBindings] = useState<Record<string, string>>({})

  useEffect(() => {
    (async () => {
      const settings = await api.settings.get()
      setModels(settings.models?.filter((m: ModelConfig) => m.enabled) || [])
      const b: Record<string, string> = {}
      settings.roleBindings?.forEach((rb: any) => { b[rb.roleId] = rb.primaryModelId })
      setBindings(b)
    })()
  }, [])

  const handleChange = (roleId: string, modelId: string) => {
    setBindings(prev => ({ ...prev, [roleId]: modelId }))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">为每个 AI 角色分配模型。未分配的角色使用默认 Fallback 模型。</p>
      <div className="space-y-3">
        {WRITER_ROLES.map(role => (
          <div key={role} className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-40 flex-shrink-0">
              <div className="text-sm text-zinc-300">{ROLE_LABELS[role] || role}</div>
              <div className="text-xs text-zinc-600">{role}</div>
            </div>
            <Select value={bindings[role] || '__none__'} onValueChange={v => handleChange(role, v === '__none__' ? '' : v)}>
              <SelectTrigger className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="未分配 (使用 Fallback)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="__none__">未分配</SelectItem>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.displayName} ({m.modelId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
