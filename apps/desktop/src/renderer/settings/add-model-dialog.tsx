import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ModelConfig, AIProviderType } from '@novelforge/shared'

interface AddModelDialogProps {
  onSave: (model: ModelConfig) => void
  onClose: () => void
}

const PROVIDERS: Array<{ id: AIProviderType; label: string }> = [
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI (GPT-4o)' },
  { id: 'openai-compatible', label: 'OpenAI-Compatible (DeepSeek/通义/月之暗面...) ' },
  { id: 'custom', label: 'Custom HTTP' },
]

export function AddModelDialog({ onSave, onClose }: AddModelDialogProps) {
  const [provider, setProvider] = useState<AIProviderType>('anthropic')
  const [displayName, setDisplayName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [modelId, setModelId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const showBaseUrl = provider === 'openai-compatible' || provider === 'custom'

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await (window as any).novelforge.ai.testConnection({
        id: 'temp', provider, displayName, apiKey, baseURL: showBaseUrl ? baseURL : undefined, modelId, tags: [], enabled: true,
      })
      setTestResult(result.valid ? '连接成功' : `失败: ${result.error}`)
    } catch (e: any) {
      setTestResult(`错误: ${e.message}`)
    }
    setTesting(false)
  }

  const handleSave = () => {
    if (!displayName || !apiKey || !modelId) return
    onSave({
      id: `${provider}-${modelId}-${Date.now()}`,
      provider, displayName, apiKey,
      baseURL: showBaseUrl ? baseURL : undefined,
      modelId, tags: [], enabled: true,
    })
  }

  const isValid = displayName && apiKey && modelId

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">添加 AI 模型</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Provider</label>
            <Select value={provider} onValueChange={v => setProvider(v as AIProviderType)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">显示名称</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="如: Claude Opus" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">API Key</label>
            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..." className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          </div>

          {showBaseUrl && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Base URL</label>
              <Input value={baseURL} onChange={e => setBaseURL(e.target.value)}
                placeholder="https://api.openai.com/v1" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Model ID</label>
            <Input value={modelId} onChange={e => setModelId(e.target.value)}
              placeholder="如: claude-opus-4-7" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
          </div>

          {testResult && (
            <div className={`text-xs p-2 rounded ${testResult.includes('成功') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {testResult}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={!isValid || testing}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
