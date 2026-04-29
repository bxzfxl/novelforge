import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, AlertCircle } from 'lucide-react'

interface StreamEntry {
  id: string
  role: string
  content: string
  status: 'running' | 'done' | 'error'
  tokens?: number
}

const MOCK_STREAM: StreamEntry[] = [
  { id: '1', role: '故事架构师', content: '正在分析大纲结构，生成章节框架...', status: 'done', tokens: 1240 },
  { id: '2', role: '主笔', content: '基于架构师的框架，正在撰写初稿...', status: 'running' },
]

function StatusIcon({ status }: { status: StreamEntry['status'] }) {
  switch (status) {
    case 'running': return <Loader2 size={12} className="text-[var(--color-nf-accent)] animate-spin" />
    case 'done':    return <Check size={12} className="text-[var(--color-nf-green)]" />
    case 'error':   return <AlertCircle size={12} className="text-[var(--color-nf-red)]" />
  }
}

export function AiStream() {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="text-[11px] text-nf-text-3">
          管线运行时 AI 输出将实时显示在这里
        </div>

        {MOCK_STREAM.map(entry => (
          <div
            key={entry.id}
            className={`bg-white border rounded-lg p-3 transition-colors ${
              entry.status === 'running'
                ? 'border-[var(--color-nf-accent)]/20 bg-[#fafffe]'
                : entry.status === 'error'
                ? 'border-[var(--color-nf-red)]/20 bg-[#fff5f5]'
                : 'border-nf-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <StatusIcon status={entry.status} />
              <span className="text-[12px] font-medium text-nf-text">{entry.role}</span>
              {entry.tokens && (
                <span className="text-[10px] text-nf-text-3 ml-auto">
                  {entry.tokens.toLocaleString()} tok
                </span>
              )}
            </div>
            <p className="text-[12px] text-nf-text-2 leading-relaxed">
              {entry.content}
            </p>
          </div>
        ))}

        {MOCK_STREAM.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[13px] text-nf-text-3 animate-pulse">等待管线启动...</div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
