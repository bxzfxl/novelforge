interface OutlineStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
}

export function OutlineStep({ data, onChange }: OutlineStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-zinc-200">大纲规划</h2>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">总纲/主线概述</label>
        <textarea
          className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="描述全书的主要故事线、核心冲突、重大转折..."
          value={data.masterOutline || ''}
          onChange={e => onChange('masterOutline', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">分卷规划</label>
        <textarea
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="每卷的大致内容和目标..."
          value={data.volumePlan || ''}
          onChange={e => onChange('volumePlan', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">支线/伏笔规划</label>
        <textarea
          className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="核心伏笔和支线剧情..."
          value={data.subplots || ''}
          onChange={e => onChange('subplots', e.target.value)}
        />
      </div>
    </div>
  )
}
