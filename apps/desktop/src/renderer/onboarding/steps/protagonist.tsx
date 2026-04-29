import { Input } from '@/components/ui/input'

interface ProtagonistStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
  isAdvanced?: boolean
}

const ta = "nf-textarea"

export function ProtagonistStep({ data, onChange, isAdvanced }: ProtagonistStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-nf-text">主角设定</h2>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">姓名 *</label>
        <Input value={data.protagonistName || ''} onChange={e => onChange('protagonistName', e.target.value)} placeholder="主角姓名" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-nf-muted mb-1.5 block font-medium">年龄</label>
          <Input value={data.protagonistAge || ''} onChange={e => onChange('protagonistAge', e.target.value)} placeholder="如：18" />
        </div>
        <div>
          <label className="text-xs text-nf-muted mb-1.5 block font-medium">初始身份</label>
          <Input value={data.protagonistRole || ''} onChange={e => onChange('protagonistRole', e.target.value)} placeholder="如：外门弟子" />
        </div>
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">性格描述</label>
        <textarea
          className={`${ta} h-24`}
          placeholder="描述主角的性格特点、行为准则..."
          value={data.protagonistPersonality || ''}
          onChange={e => onChange('protagonistPersonality', e.target.value)}
        />
      </div>

      {isAdvanced && (
        <>
          <div>
            <label className="text-xs text-nf-muted mb-1.5 block font-medium">背景故事</label>
            <textarea
              className={`${ta} h-24`}
              placeholder="主角的成长经历、家庭背景..."
              value={data.protagonistBackground || ''}
              onChange={e => onChange('protagonistBackground', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-nf-muted mb-1.5 block font-medium">金手指/特殊能力</label>
            <Input value={data.protagonistAbility || ''} onChange={e => onChange('protagonistAbility', e.target.value)} placeholder="如：神秘玉佩、前世记忆" />
          </div>
          <div>
            <label className="text-xs text-nf-muted mb-1.5 block font-medium">成长弧线</label>
            <Input value={data.protagonistArc || ''} onChange={e => onChange('protagonistArc', e.target.value)} placeholder="如：天真少年→独当一面的强者" />
          </div>
        </>
      )}
    </div>
  )
}
