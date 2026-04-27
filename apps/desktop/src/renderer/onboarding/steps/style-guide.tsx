import { Input } from '@/components/ui/input'

interface StyleGuideStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
}

export function StyleGuideStep({ data, onChange }: StyleGuideStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-zinc-200">风格规范</h2>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">叙事视角</label>
        <Input value={data.narrativePov || ''} onChange={e => onChange('narrativePov', e.target.value)}
          placeholder="如：第三人称跟随主角" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">叙事风格</label>
        <Input value={data.narrativeStyle || ''} onChange={e => onChange('narrativeStyle', e.target.value)}
          placeholder="如：轻松幽默、严肃深沉" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">对话规范</label>
        <textarea
          className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="对话风格、口语化程度..."
          value={data.dialogueRules || ''}
          onChange={e => onChange('dialogueRules', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">写作节奏</label>
        <Input value={data.pacing || ''} onChange={e => onChange('pacing', e.target.value)}
          placeholder="如：快节奏爽文、慢热型" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">禁忌/避免写法</label>
        <textarea
          className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="需要避开的套路、敏感内容..."
          value={data.taboos || ''}
          onChange={e => onChange('taboos', e.target.value)}
        />
      </div>
    </div>
  )
}
