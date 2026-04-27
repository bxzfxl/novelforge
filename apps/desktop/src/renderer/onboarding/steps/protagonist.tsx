import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface ProtagonistStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
  isAdvanced?: boolean
}

export function ProtagonistStep({ data, onChange, isAdvanced }: ProtagonistStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-zinc-200">主角设定</h2>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">姓名 *</label>
        <Input value={data.protagonistName || ''} onChange={e => onChange('protagonistName', e.target.value)}
          placeholder="主角姓名" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">年龄</label>
          <Input value={data.protagonistAge || ''} onChange={e => onChange('protagonistAge', e.target.value)}
            placeholder="如：18" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">初始身份</label>
          <Input value={data.protagonistRole || ''} onChange={e => onChange('protagonistRole', e.target.value)}
            placeholder="如：外门弟子" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">性格描述</label>
        <textarea
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="描述主角的性格特点、行为准则..."
          value={data.protagonistPersonality || ''}
          onChange={e => onChange('protagonistPersonality', e.target.value)}
        />
      </div>

      {isAdvanced && (
        <>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">背景故事</label>
            <textarea
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
              placeholder="主角的成长经历、家庭背景..."
              value={data.protagonistBackground || ''}
              onChange={e => onChange('protagonistBackground', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">金手指/特殊能力</label>
            <Input value={data.protagonistAbility || ''} onChange={e => onChange('protagonistAbility', e.target.value)}
              placeholder="如：神秘玉佩、前世记忆" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">成长弧线</label>
            <Input value={data.protagonistArc || ''} onChange={e => onChange('protagonistArc', e.target.value)}
              placeholder="如：天真少年→独当一面的强者" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
          </div>
        </>
      )}
    </div>
  )
}
