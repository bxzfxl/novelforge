import type { ViewMode } from '@/layouts/studio-layout'
import { ScrollArea } from '@/components/ui/scroll-area'

interface InspectorPanelProps {
  viewMode: ViewMode
}

export function InspectorPanel({ viewMode }: InspectorPanelProps) {
  return (
    <div className="h-full flex flex-col bg-nf-surface">
      <div className="px-3 py-2 border-b border-nf-border">
        <span className="text-xs font-semibold text-nf-muted uppercase tracking-wider">
          {viewMode === 'writing' ? '章节信息' : viewMode === 'command' ? 'AI 输出' : '审阅'}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {viewMode === 'writing' && <ChapterInfoCard />}
          {viewMode === 'command' && <AiStreamView />}
          {viewMode === 'review' && <ReviewInfo />}
        </div>
      </ScrollArea>
    </div>
  )
}

function ChapterInfoCard() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-nf-text">第 1 章</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: '状态', value: '草稿' },
            { label: '字数', value: '0' },
            { label: '视角', value: '主角' },
            { label: '场景', value: '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-nf-border rounded-lg p-2">
              <div className="text-nf-muted-light mb-0.5">{label}</div>
              <div className="text-nf-text font-medium">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-nf-muted mb-2">出场角色</h4>
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-0.5 bg-[#f2f9ff] rounded-full text-xs text-[#097fe8] font-medium">主角</span>
        </div>
      </div>
    </div>
  )
}

function AiStreamView() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-nf-muted-light">管线运行时 AI 输出将实时显示在这里</div>
      <div className="bg-white border border-nf-border rounded-lg p-3">
        <div className="text-xs text-nf-muted-light animate-pulse">等待管线启动...</div>
      </div>
    </div>
  )
}

function ReviewInfo() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-nf-muted-light">审阅模式 — 并排对比修改</div>
    </div>
  )
}
