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
    case 'completed': return <Check size={14} className="text-green-600" />
    case 'running': return <Loader2 size={14} className="text-[#0075de] animate-spin" />
    case 'failed': return <AlertCircle size={14} className="text-red-500" />
    default: return <Clock size={14} className="text-nf-muted-light" />
  }
}

export function PipelineMonitor() {
  const { pipeline, isRunning, start, pause, stop, loadState } = usePipelineStore()
  const [projectName, setProjectName] = useState('default')

  useEffect(() => { loadState() }, [])

  if (!pipeline) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-nf-bg text-nf-muted p-8">
        <p className="text-base font-medium mb-1">管线未启动</p>
        <p className="text-sm text-nf-muted-light mb-6">配置项目后启动 AI 写作流程</p>
        <div className="flex gap-2">
          <input
            className="px-3 py-1.5 bg-white border border-nf-border rounded text-sm text-nf-text outline-none focus:ring-2 focus:ring-[#097fe8]"
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
    <div className="h-full flex flex-col bg-nf-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nf-border bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-nf-text">管线监控</h2>
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
        <div className="w-full h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0075de] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-nf-muted-light">
          <span>{progress}%</span>
          <span>{pipeline.completedChapters}/{pipeline.totalChapters} 章</span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs">
          <div>
            <span className="text-nf-muted-light">状态 </span>
            <Badge variant={pipeline.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
              {pipeline.status}
            </Badge>
          </div>
          <div><span className="text-nf-muted-light">Tokens </span><span className="text-nf-muted">{pipeline.totalTokens.toLocaleString()}</span></div>
          <div><span className="text-nf-muted-light">成本 </span><span className="text-nf-muted">{costDisplay}</span></div>
        </div>
      </div>

      {/* Steps list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {pipeline.steps.length === 0 ? (
            <p className="text-xs text-nf-muted-light text-center py-8">等待步骤开始...</p>
          ) : (
            pipeline.steps.map(step => (
              <div key={step.id}
                className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                  step.status === 'running' ? 'bg-[#f2f9ff]' :
                  step.status === 'failed' ? 'bg-red-50' : ''
                }`}
              >
                <StepIcon status={step.status} />
                <span className="flex-1 text-nf-text">{STEP_LABELS[step.role] || step.role}</span>
                {step.tokensUsed && <span className="text-xs text-nf-muted-light">{step.tokensUsed.toLocaleString()} tok</span>}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* AI output stream area */}
      <div className="border-t border-nf-border p-3 bg-nf-surface">
        <div className="text-xs text-nf-muted mb-1.5 font-medium">AI 输出</div>
        <div className="h-24 bg-white border border-nf-border rounded-lg p-3 overflow-auto">
          <div className="text-xs text-nf-muted-light animate-pulse">
            {isRunning ? '等待 AI 响应...' : '管线空闲'}
          </div>
        </div>
      </div>
    </div>
  )
}
