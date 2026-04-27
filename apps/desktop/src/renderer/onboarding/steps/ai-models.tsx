import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

interface AiModelsStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
  isAdvanced?: boolean
}

export function AiModelsStep({ data, onChange, isAdvanced }: AiModelsStepProps) {
  const models = data.models || []
  const [showForm, setShowForm] = useState(false)
  const [provider, setProvider] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [displayName, setDisplayName] = useState('')

  const addModel = () => {
    if (!apiKey || !modelId) return
    onChange('models', [...models, {
      id: `${provider}-${modelId}`,
      provider, displayName: displayName || modelId, apiKey, modelId, enabled: true, tags: [],
    }])
    setApiKey(''); setModelId(''); setDisplayName(''); setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-zinc-200">AI 模型配置</h2>
      <p className="text-sm text-zinc-500">至少配置一个模型。可跳过，后续在设置中配置。</p>

      {models.map((m: any, i: number) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex-1">
            <div className="text-sm text-zinc-300">{m.displayName}</div>
            <div className="text-xs text-zinc-500">{m.provider} · {m.modelId}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onChange('models', models.filter((_: any, j: number) => j !== i))}>
            <X size={14} className="text-zinc-500" />
          </Button>
        </div>
      ))}

      {!showForm ? (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1" /> 添加模型
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="google">Google Gemini</SelectItem>
              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
              <SelectItem value="openai-compatible">OpenAI-Compatible</SelectItem>
            </SelectContent>
          </Select>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="显示名称（如：Claude Opus）" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="API Key" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          <Input value={modelId} onChange={e => setModelId(e.target.value)}
            placeholder="Model ID（如：claude-opus-4-7）" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          <div className="flex gap-2">
            <Button size="sm" onClick={addModel}>添加</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {models.length === 0 && (
        <Button variant="link" onClick={() => {}} className="text-xs text-zinc-600">
          跳过，稍后配置
        </Button>
      )}
    </div>
  )
}
