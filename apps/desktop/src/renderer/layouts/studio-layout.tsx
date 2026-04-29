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
  const [leftWidth, setLeftWidth]   = useState(232)
  const [rightWidth, setRightWidth] = useState(260)
  const [viewMode, setViewMode]     = useState<ViewMode>('writing')
  const [commandOpen, setCommandOpen] = useState(false)

  const handleLeftResize = (e: React.MouseEvent) => {
    const startX = e.clientX; const startW = leftWidth
    const onMove = (ev: MouseEvent) => setLeftWidth(Math.max(160, Math.min(360, startW + ev.clientX - startX)))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  const handleRightResize = (e: React.MouseEvent) => {
    const startX = e.clientX; const startW = rightWidth
    const onMove = (ev: MouseEvent) => setRightWidth(Math.max(200, Math.min(440, startW - ev.clientX + startX)))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex h-screen flex-col bg-white text-[rgb(55,53,47)] select-none">
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-hidden">
          <NavigationPanel />
        </div>

        {/* Left resize handle */}
        <div
          className="w-px flex-shrink-0 bg-[rgba(55,53,47,0.06)] cursor-col-resize hover:bg-[var(--color-nf-accent)]/40 transition-colors"
          onMouseDown={handleLeftResize}
        />

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <EditorPanel viewMode={viewMode} onCommandOpen={() => setCommandOpen(true)} />
        </div>

        {/* Right resize handle */}
        <div
          className="w-px flex-shrink-0 bg-[rgba(55,53,47,0.06)] cursor-col-resize hover:bg-[var(--color-nf-accent)]/40 transition-colors"
          onMouseDown={handleRightResize}
        />

        {/* Right inspector */}
        <div style={{ width: rightWidth }} className="flex-shrink-0 overflow-hidden">
          <InspectorPanel viewMode={viewMode} />
        </div>
      </div>

      <StatusBar viewMode={viewMode} onViewModeChange={setViewMode} onOpenSettings={onOpenSettings} />

      {commandOpen && <CommandBar onClose={() => setCommandOpen(false)} />}
    </div>
  )
}
