import { useState } from 'react'
import { NavigationPanel } from '@/panels/navigator'
import { EditorPanel } from '@/panels/editor'
import { InspectorPanel } from '@/panels/inspector'
import { CommandBar } from '@/panels/command-bar'
import { StatusBar } from '@/components/status-bar'

export type ViewMode = 'writing' | 'command' | 'review'

interface StudioLayoutProps {
  onOpenSettings?: () => void
  onOpenExport?: () => void
}

export function StudioLayout({ onOpenSettings }: StudioLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(240)
  const [rightWidth, setRightWidth] = useState(280)
  const [viewMode, setViewMode] = useState<ViewMode>('writing')
  const [commandOpen, setCommandOpen] = useState(false)

  const handleLeftResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startW = leftWidth
    const onMove = (ev: MouseEvent) => {
      setLeftWidth(Math.max(180, Math.min(400, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleRightResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startW = rightWidth
    const onMove = (ev: MouseEvent) => {
      setRightWidth(Math.max(200, Math.min(500, startW - ev.clientX + startX)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex h-screen flex-col bg-nf-bg text-nf-text select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Navigation */}
        <div
          style={{ width: leftWidth }}
          className="flex-shrink-0 border-r border-nf-border overflow-hidden transition-all duration-200 ease-out"
        >
          <NavigationPanel />
        </div>

        {/* Left Resizer */}
        <div
          className="w-1 cursor-col-resize bg-nf-border hover:bg-blue-500/50 transition-colors flex-shrink-0"
          onMouseDown={handleLeftResize}
        />

        {/* Center: Editor */}
        <div className="flex-1 overflow-hidden">
          <EditorPanel viewMode={viewMode} onCommandOpen={() => setCommandOpen(true)} />
        </div>

        {/* Right Resizer */}
        <div
          className="w-1 cursor-col-resize bg-nf-border hover:bg-blue-500/50 transition-colors flex-shrink-0"
          onMouseDown={handleRightResize}
        />

        {/* Right: Inspector */}
        <div
          style={{ width: rightWidth }}
          className="flex-shrink-0 border-l border-nf-border overflow-hidden transition-all duration-200 ease-out"
        >
          <InspectorPanel viewMode={viewMode} />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenSettings={onOpenSettings}
      />

      {/* Command Bar Overlay */}
      {commandOpen && (
        <CommandBar onClose={() => setCommandOpen(false)} />
      )}
    </div>
  )
}
