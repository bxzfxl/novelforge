interface OutlineStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
}

const ta = "nf-textarea"

export function OutlineStep({ data, onChange }: OutlineStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-nf-text">大纲规划</h2>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">总纲/主线概述</label>
        <textarea
          className={`${ta} h-32`}
          placeholder="描述全书的主要故事线、核心冲突、重大转折..."
          value={data.masterOutline || ''}
          onChange={e => onChange('masterOutline', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">分卷规划</label>
        <textarea
          className={`${ta} h-24`}
          placeholder="每卷的大致内容和目标..."
          value={data.volumePlan || ''}
          onChange={e => onChange('volumePlan', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">支线/伏笔规划</label>
        <textarea
          className={`${ta} h-20`}
          placeholder="核心伏笔和支线剧情..."
          value={data.subplots || ''}
          onChange={e => onChange('subplots', e.target.value)}
        />
      </div>
    </div>
  )
}
