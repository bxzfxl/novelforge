import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
}

const FORMATS = [
  { id: 'epub', label: 'EPUB', desc: '电子书格式，支持封面和目录' },
  { id: 'txt', label: 'TXT', desc: '纯文本，兼容性最好' },
  { id: 'docx', label: 'DOCX', desc: 'Word 文档，可编辑' },
  { id: 'pdf', label: 'PDF', desc: '打印格式，布局固定' },
]

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState('epub')
  const [includeCover, setIncludeCover] = useState(true)
  const [includeToc, setIncludeToc] = useState(true)
  const [watermark, setWatermark] = useState(false)

  const handleExport = async () => {
    try {
      await (window as any).novelforge.native.exportProject('default', format)
      onClose()
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">导出项目</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">导出格式</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    format === f.id
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {format === 'epub' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={includeCover} onChange={e => setIncludeCover(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800" />
                包含封面
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={includeToc} onChange={e => setIncludeToc(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800" />
                包含目录
              </label>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={watermark} onChange={e => setWatermark(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800" />
            添加 NovelForge 水印
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleExport}>导出 {format.toUpperCase()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
