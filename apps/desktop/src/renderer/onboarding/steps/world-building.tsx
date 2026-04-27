import { Input } from '@/components/ui/input'

interface WorldBuildingStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
  isAdvanced?: boolean
}

export function WorldBuildingStep({ data, onChange, isAdvanced }: WorldBuildingStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-zinc-200">世界观设定</h2>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">世界名称</label>
        <Input value={data.worldName || ''} onChange={e => onChange('worldName', e.target.value)}
          placeholder="如：青云大陆" className="bg-zinc-900 border-zinc-800 text-zinc-200" />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">核心规则/修炼体系</label>
        <textarea
          className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
          placeholder="描述世界的核心运行规则、修炼体系、魔法/科技等..."
          value={data.coreRules || ''}
          onChange={e => onChange('coreRules', e.target.value)}
        />
      </div>

      {isAdvanced && (
        <>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">势力分布</label>
            <textarea
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
              placeholder="主要宗门、国家、组织及其关系..."
              value={data.factions || ''}
              onChange={e => onChange('factions', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">地理版图</label>
            <textarea
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
              placeholder="主要地区、城市、地形..."
              value={data.geography || ''}
              onChange={e => onChange('geography', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">用语词典</label>
            <textarea
              className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 resize-none outline-none focus:border-zinc-700"
              placeholder="特殊术语、修炼等级名称..."
              value={data.glossary || ''}
              onChange={e => onChange('glossary', e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  )
}
