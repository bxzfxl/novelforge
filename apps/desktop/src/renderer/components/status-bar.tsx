import type { ViewMode } from '@/layouts/studio-layout'
import { PenLine, Gauge, FileCheck, Settings } from 'lucide-react'

interface StatusBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onOpenSettings?: () => void
}

const modes: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
  { id: 'writing', label: '写作', icon: <PenLine size={12} /> },
  { id: 'command', label: '指挥', icon: <Gauge size={12} /> },
  { id: 'review', label: '审阅', icon: <FileCheck size={12} /> },
]

export function StatusBar({ viewMode, onViewModeChange, onOpenSettings }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between h-7 px-3 bg-nf-surface border-t border-nf-border text-xs text-nf-muted-light">
      <div className="flex items-center gap-3">
        <span>第 1 卷 · 第 1 章</span>
        <span className="opacity-30">|</span>
        <span>0 字</span>
        <span className="opacity-30">|</span>
        <span>管线: 空闲</span>
      </div>

      <div className="flex items-center gap-1">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => onViewModeChange(mode.id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              viewMode === mode.id
                ? 'bg-[var(--color-nf-badge-bg)] text-[var(--color-nf-badge-text)]'
                : 'hover:bg-[rgba(0,0,0,0.04)] text-nf-muted-light hover:text-nf-muted'
            }`}
            title={mode.label + '模式'}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        ))}
        <span className="opacity-30 mx-1">|</span>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[rgba(0,0,0,0.04)] text-nf-muted-light hover:text-nf-muted transition-colors"
            title="设置"
          >
            <Settings size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
