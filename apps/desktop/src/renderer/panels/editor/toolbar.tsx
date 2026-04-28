import { Eye, EyeOff } from 'lucide-react'

interface EditorToolbarProps {
  wordCount: number
  showPreview: boolean
  onTogglePreview: () => void
}

export function EditorToolbar({ wordCount, showPreview, onTogglePreview }: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-nf-border bg-nf-surface">
      <div className="flex items-center gap-3">
        <span className="text-xs text-nf-muted">{wordCount.toLocaleString()} 字</span>
        <span className="text-xs text-nf-muted-light">|</span>
        <span className="text-xs text-nf-muted-light">目标: 3,000 字</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePreview}
          className="p-1 rounded hover:bg-[rgba(0,0,0,0.06)] text-nf-muted-light hover:text-nf-muted transition-colors"
          title={showPreview ? '关闭预览' : '开启预览'}
        >
          {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}
