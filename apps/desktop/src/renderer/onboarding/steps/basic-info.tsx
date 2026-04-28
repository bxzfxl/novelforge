import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BasicInfoStepProps {
  data: Record<string, any>
  onChange: (key: string, value: any) => void
  isAdvanced?: boolean
}

const GENRES = ['玄幻', '仙侠', '都市', '科幻', '历史', '悬疑', '轻小说', '武侠', '奇幻', '末日']

export function BasicInfoStep({ data, onChange, isAdvanced }: BasicInfoStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-nf-text">基本信息</h2>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">书名 *</label>
        <Input value={data.title || ''} onChange={e => onChange('title', e.target.value)} placeholder="你的小说书名" />
      </div>

      <div>
        <label className="text-xs text-nf-muted mb-1.5 block font-medium">笔名</label>
        <Input value={data.author || ''} onChange={e => onChange('author', e.target.value)} placeholder="你的笔名" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-nf-muted mb-1.5 block font-medium">类型</label>
          <Select value={data.genre || ''} onValueChange={v => onChange('genre', v)}>
            <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
            <SelectContent>
              {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-nf-muted mb-1.5 block font-medium">目标字数</label>
          <Select value={data.targetWords || ''} onValueChange={v => onChange('targetWords', v)}>
            <SelectTrigger><SelectValue placeholder="选择字数" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="300000">30 万字</SelectItem>
              <SelectItem value="600000">60 万字</SelectItem>
              <SelectItem value="1000000">100 万字</SelectItem>
              <SelectItem value="2000000">200 万字</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAdvanced && (
        <>
          <div>
            <label className="text-xs text-nf-muted mb-1.5 block font-medium">子类型</label>
            <Input value={data.subGenre || ''} onChange={e => onChange('subGenre', e.target.value)} placeholder="如：废柴逆袭、凡人修仙" />
          </div>
          <div>
            <label className="text-xs text-nf-muted mb-1.5 block font-medium">简介</label>
            <textarea
              className="w-full h-24 bg-white border border-[#dddddd] rounded p-3 text-sm text-nf-text resize-none outline-none focus:ring-2 focus:ring-[#097fe8] placeholder-[#a39e98]"
              placeholder="简要介绍故事背景和主线..."
              value={data.synopsis || ''}
              onChange={e => onChange('synopsis', e.target.value)}
            />
          </div>
        </>
      )}

      {!isAdvanced && (
        <div>
          <label className="text-xs text-nf-muted mb-1.5 block font-medium">简介（可选）</label>
          <textarea
            className="w-full h-20 bg-white border border-[#dddddd] rounded p-3 text-sm text-nf-text resize-none outline-none focus:ring-2 focus:ring-[#097fe8] placeholder-[#a39e98]"
            placeholder="简要介绍故事..."
            value={data.synopsis || ''}
            onChange={e => onChange('synopsis', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
