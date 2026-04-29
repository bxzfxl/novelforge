import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, AlertTriangle } from 'lucide-react'

interface ReviewItem {
  id: string
  category: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  note?: string
}

export function CheckpointReview() {
  const [items, setItems] = useState<ReviewItem[]>([
    { id: '1', category: '主线', description: '主线情节是否符合大纲方向', status: 'pending' },
    { id: '2', category: '伏笔', description: '伏笔回收是否完整，新伏笔是否合理', status: 'pending' },
    { id: '3', category: '角色', description: '角色行为是否符合人设，弧线是否推进', status: 'pending' },
    { id: '4', category: '战力体系', description: '战力/境界体系是否一致', status: 'pending' },
    { id: '5', category: '感情线', description: '感情线发展是否自然', status: 'pending' },
    { id: '6', category: '节奏', description: '章节节奏是否合理，是否有拖沓', status: 'pending' },
  ])

  const approve = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' as const } : i))
  }

  const reject = (id: string) => {
    const note = prompt('驳回理由（将发送给 AI 修改）：')
    if (note) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' as const, note } : i))
    }
  }

  const approved = items.filter(i => i.status === 'approved').length
  const rejected = items.filter(i => i.status === 'rejected').length

  return (
    <div className="h-full flex flex-col bg-nf-bg">
      <div className="px-4 py-3 border-b border-nf-border bg-white">
        <h2 className="text-sm font-semibold text-nf-text mb-1">检查点审阅</h2>
        <div className="flex gap-3 text-xs">
          <span className="text-[var(--color-nf-green)] font-medium">{approved} 通过</span>
          {rejected > 0 && <span className="text-[var(--color-nf-red)] font-medium">{rejected} 驳回</span>}
          <span className="text-nf-muted-light">{items.length - approved - rejected} 待审</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {items.map(item => (
          <div key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              item.status === 'approved' ? 'bg-[var(--color-nf-green-50)] border-[var(--color-nf-green-100)]' :
              item.status === 'rejected' ? 'bg-[var(--color-nf-red-50)] border-[var(--color-nf-red-100)]' :
              'bg-white border-nf-border'
            }`}
          >
            {item.status === 'approved' && <Check size={14} className="text-[var(--color-nf-green)] flex-shrink-0" />}
            {item.status === 'rejected' && <X size={14} className="text-[var(--color-nf-red)] flex-shrink-0" />}
            {item.status === 'pending' && <AlertTriangle size={14} className="text-nf-muted-light flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{item.category}</Badge>
                <span className="text-sm text-nf-text truncate">{item.description}</span>
              </div>
              {item.note && <div className="text-xs text-[var(--color-nf-red)] mt-1">驳回理由: {item.note}</div>}
            </div>

            {item.status === 'pending' && (
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => approve(item.id)} title="通过">
                  <Check size={14} className="text-[var(--color-nf-green)]" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reject(item.id)} title="驳回">
                  <X size={14} className="text-[var(--color-nf-red)]" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.every(i => i.status !== 'pending') && (
        <div className="p-4 border-t border-nf-border bg-nf-surface">
          <Button className="w-full" size="sm">
            提交审阅结果 → 进入下一章
          </Button>
        </div>
      )}
    </div>
  )
}
