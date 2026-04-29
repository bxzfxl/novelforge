import type { ViewMode } from '@/layouts/studio-layout'
import { ChapterInfo } from './chapter-info'
import { AiStream } from './ai-stream'

interface InspectorPanelProps {
  viewMode: ViewMode
}

export function InspectorPanel({ viewMode }: InspectorPanelProps) {
  return (
    <div className="h-full flex flex-col bg-nf-surface">
      <div className="px-3 py-2 border-b border-nf-border">
        <span className="text-[11px] font-semibold text-nf-text-3 uppercase tracking-wider">
          {viewMode === 'writing' ? '章节信息' : viewMode === 'command' ? 'AI 输出' : '审阅'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        {viewMode === 'writing' && <ChapterInfo />}
        {viewMode === 'command' && <AiStream />}
        {viewMode === 'review' && <ReviewInfo />}
      </div>
    </div>
  )
}

function ReviewInfo() {
  return (
    <div className="p-3 space-y-3">
      <div className="text-[12px] text-nf-text-3 leading-relaxed">
        审阅模式下，编辑器将左右分屏显示修改前后的对比。
      </div>
      <div className="bg-white border border-nf-border rounded-lg p-3">
        <div className="text-[12px] text-nf-text-3">
          选择一个章节进入审阅模式，AI 修改建议将高亮标注差异。
        </div>
      </div>
    </div>
  )
}
