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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出项目</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <label className="text-xs text-nf-muted mb-2 block font-medium">导出格式</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === f.id
                      ? 'border-[var(--color-nf-accent)]/40 bg-[var(--color-nf-badge-bg)] shadow-[0_0_0_1px_rgba(0,117,222,0.2)]'
                      : 'border-nf-border bg-white hover:border-[rgba(0,0,0,0.2)] hover:bg-nf-surface'
                  }`}
                >
                  <div className={`text-sm font-semibold ${format === f.id ? 'text-[var(--color-nf-accent)]' : 'text-nf-text'}`}>{f.label}</div>
                  <div className="text-xs text-nf-muted-light mt-0.5 leading-relaxed">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {format === 'epub' && (
            <div className="space-y-2.5">
              {[
                { checked: includeCover, onChange: setIncludeCover, label: '包含封面' },
                { checked: includeToc, onChange: setIncludeToc, label: '包含目录' },
              ].map(({ checked, onChange, label }) => (
                <label key={label} className="flex items-center gap-2.5 text-sm text-nf-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="rounded border-[rgba(0,0,0,0.2)] accent-[var(--color-nf-accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm text-nf-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={watermark}
              onChange={e => setWatermark(e.target.checked)}
              className="rounded border-[rgba(0,0,0,0.2)] accent-[var(--color-nf-accent)]"
            />
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
