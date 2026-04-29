import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChapterMeta {
  title: string
  status: 'draft' | 'review' | 'done'
  wordCount: number
  targetWords: number
  pov: string
  scene: string
  characters: string[]
}

const MOCK: ChapterMeta = {
  title: '第 1 章 命运的开端',
  status: 'draft',
  wordCount: 3200,
  targetWords: 3000,
  pov: '第三人称 · 主角视角',
  scene: '青云镇 · 清晨',
  characters: ['林尘', '老村长'],
}

const STATUS_MAP = {
  draft:  { label: '草稿', variant: 'secondary' as const },
  review: { label: '审阅中', variant: 'default' as const },
  done:   { label: '已完成', variant: 'success' as const },
}

export function ChapterInfo() {
  const st = STATUS_MAP[MOCK.status]
  const progress = Math.min(100, Math.round((MOCK.wordCount / MOCK.targetWords) * 100))

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* 章节标题 */}
        <div>
          <h3 className="text-[13px] font-semibold text-nf-text leading-tight">{MOCK.title}</h3>
          <div className="mt-1.5">
            <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '字数', value: MOCK.wordCount.toLocaleString() },
            { label: '进度', value: `${progress}%` },
            { label: '视角', value: MOCK.pov.split('·')[0].trim() },
            { label: '场景', value: MOCK.scene.split('·')[0].trim() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-nf-border rounded-lg p-2.5">
              <div className="text-[11px] text-nf-text-3 mb-0.5">{label}</div>
              <div className="text-[13px] text-nf-text font-medium">{value}</div>
            </div>
          ))}
        </div>

        {/* 字数进度条 */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-nf-text-3 mb-1">
            <span>字数进度</span>
            <span>{MOCK.wordCount.toLocaleString()} / {MOCK.targetWords.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-[rgba(55,53,47,0.06)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-[var(--color-nf-green)]' : 'bg-[var(--color-nf-accent)]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 场景信息 */}
        <div>
          <h4 className="text-[11px] font-medium text-nf-text-3 mb-1.5">场景</h4>
          <div className="text-[13px] text-nf-text-2">{MOCK.scene}</div>
        </div>

        {/* 出场角色 */}
        <div>
          <h4 className="text-[11px] font-medium text-nf-text-3 mb-1.5">出场角色</h4>
          <div className="flex flex-wrap gap-1">
            {MOCK.characters.map(c => (
              <span
                key={c}
                className="px-2 py-0.5 bg-[var(--color-nf-badge-bg)] rounded-full text-[11px] text-[var(--color-nf-badge-text)] font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* 叙事视角 */}
        <div>
          <h4 className="text-[11px] font-medium text-nf-text-3 mb-1.5">叙事视角</h4>
          <div className="text-[13px] text-nf-text-2">{MOCK.pov}</div>
        </div>
      </div>
    </ScrollArea>
  )
}
