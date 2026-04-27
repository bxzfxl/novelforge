import type { ViewMode } from '@/layouts/studio-layout'
import { ChapterInfo } from './chapter-info'
import { AiStream } from './ai-stream'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface InspectorPanelProps {
  viewMode: ViewMode
}

export function InspectorPanel({ viewMode }: InspectorPanelProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-3 py-2 border-b border-nf-border">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
        <h3 className="text-sm font-medium text-zinc-300">第 1 章</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-900 rounded p-2">
            <div className="text-zinc-500">状态</div>
            <div className="text-zinc-300">草稿</div>
          </div>
          <div className="bg-zinc-900 rounded p-2">
            <div className="text-zinc-500">字数</div>
            <div className="text-zinc-300">0</div>
          </div>
          <div className="bg-zinc-900 rounded p-2">
            <div className="text-zinc-500">视角</div>
            <div className="text-zinc-300">主角</div>
          </div>
          <div className="bg-zinc-900 rounded p-2">
            <div className="text-zinc-500">场景</div>
            <div className="text-zinc-300">-</div>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-zinc-500 mb-1">出场角色</h4>
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">主角</span>
        </div>
      </div>
    </div>
  )
}

function AiStreamView() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500">管线运行时 AI 输出将实时显示在这里</div>
      <div className="bg-zinc-900 rounded p-3">
        <div className="text-xs text-zinc-600 animate-pulse">等待管线启动...</div>
      </div>
    </div>
  )
}

function ReviewInfo() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500">审阅模式 — 并排对比修改</div>
    </div>
  )
}
