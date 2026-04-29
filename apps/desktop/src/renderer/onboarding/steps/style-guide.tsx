import { Input } from '@/components/ui/input'

interface StyleGuideStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
}

const ta = "nf-textarea"

export function StyleGuideStep({ data, onChange }: StyleGuideStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-nf-text">风格规范</h2>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">叙事视角</label>
        <Input value={data.narrativePov || ''} onChange={e => onChange('narrativePov', e.target.value)} placeholder="如：第三人称跟随主角" />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">叙事风格</label>
        <Input value={data.narrativeStyle || ''} onChange={e => onChange('narrativeStyle', e.target.value)} placeholder="如：轻松幽默、严肃深沉" />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">对话规范</label>
        <textarea
          className={`${ta} h-20`}
          placeholder="对话风格、口语化程度..."
          value={data.dialogueRules || ''}
          onChange={e => onChange('dialogueRules', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">写作节奏</label>
        <Input value={data.pacing || ''} onChange={e => onChange('pacing', e.target.value)} placeholder="如：快节奏爽文、慢热型" />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">禁忌/避免写法</label>
        <textarea
          className={`${ta} h-20`}
          placeholder="需要避开的套路、敏感内容..."
          value={data.taboos || ''}
          onChange={e => onChange('taboos', e.target.value)}
        />
      </div>
    </div>
  )
}
