import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Play, Pause, Square, Check, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { usePipelineStore } from '@/stores/pipeline-store'
import type { PipelineStep } from '@novelforge/shared'

const STEP_LABELS: Record<string, string> = {
  architect: '故事架构师',
  main_writer: '主笔',
  main_writer_alt: '主笔(备选)',
  character_advocate: '角色代言人',
  atmosphere: '氛围渲染师',
  foreshadow_weaver: '伏笔编织者',
  critic: '批评家',
  continuity: '连续性审查',
  revise: '修订编辑',
  summary: '摘要生成',
}

function StepIcon({ status }: { status: PipelineStep['status'] }) {
  switch (status) {
    case 'completed': return <Check size={14} className="text-green-400" />
    case 'running': return <Loader2 size={14} className="text-blue-400 animate-spin" />
    case 'failed': return <AlertCircle size={14} className="text-red-400" />
    default: return <Clock size={14} className="text-zinc-600" />
  }
}

export function PipelineMonitor() {
  const { pipeline, isRunning, start, pause, stop, loadState } = usePipelineStore()
  const [projectName, setProjectName] = useState('default')

  useEffect(() => { loadState() }, [])

  if (!pipeline) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 p-8">
        <p className="text-lg mb-2">管线未启动</p>
        <div className="flex gap-2 mt-4">
          <input
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300 outline-none"
            placeholder="项目名称"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
          />
          <Button size="sm" onClick={() => start(projectName)}>
            <Play size={14} className="mr-1" /> 启动管线
          </Button>
        </div>
      </div>
    )
  }

  const progress = pipeline.totalChapters > 0
    ? Math.round((pipeline.completedChapters / pipeline.totalChapters) * 100)
    : 0

  const costDisplay = pipeline.totalCostUsd > 0
    ? `$${pipeline.totalCostUsd.toFixed(4)}`
    : '$0.00'

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nf-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-300">管线监控</h2>
          <div className="flex items-center gap-1">
            {isRunning ? (
              <Button variant="ghost" size="icon" onClick={pause} title="暂停"><Pause size={14} /></Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => start(projectName)} title="恢复"><Play size={14} /></Button>
            )}
            <Button variant="ghost" size="icon" onClick={stop} title="停止"><Square size={14} /></Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-zinc-500">
          <span>{progress}%</span>
          <span>{pipeline.completedChapters}/{pipeline.totalChapters} 章</span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs">
          <div>
            <span className="text-zinc-600">状态 </span>
            <Badge variant={pipeline.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
              {pipeline.status}
            </Badge>
          </div>
          <div><span className="text-zinc-600">Tokens </span><span className="text-zinc-400">{pipeline.totalTokens.toLocaleString()}</span></div>
          <div><span className="text-zinc-600">成本 </span><span className="text-zinc-400">{costDisplay}</span></div>
        </div>
      </div>

      {/* Steps list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {pipeline.steps.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-8">等待步骤开始...</p>
          ) : (
            pipeline.steps.map(step => (
              <div key={step.id}
                className={`flex items-center gap-3 p-2 rounded text-sm ${
                  step.status === 'running' ? 'bg-blue-500/10' :
                  step.status === 'failed' ? 'bg-red-500/10' : ''
                }`}
              >
                <StepIcon status={step.status} />
                <span className="flex-1 text-zinc-300">{STEP_LABELS[step.role] || step.role}</span>
                {step.tokensUsed && <span className="text-xs text-zinc-600">{step.tokensUsed.toLocaleString()} tok</span>}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* AI output stream area */}
      <div className="border-t border-nf-border p-3">
        <div className="text-xs text-zinc-500 mb-1">AI 输出</div>
        <div className="h-24 bg-zinc-900 rounded p-3 overflow-auto">
          <div className="text-xs text-zinc-600 animate-pulse">
            {isRunning ? '等待 AI 响应...' : '管线空闲'}
          </div>
        </div>
      </div>
    </div>
  )
}
