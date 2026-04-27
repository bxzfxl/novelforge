import { useState, useRef, useEffect } from 'react'
import { Sparkles, PenLine, Wand2, Expand, Shrink, MessageSquare, Palette, Search } from 'lucide-react'

interface CommandBarProps {
  onClose: () => void
}

const COMMANDS = [
  { id: 'continue', label: '续写', icon: <PenLine size={14} />, description: '从当前位置继续写作' },
  { id: 'polish', label: '润色', icon: <Sparkles size={14} />, description: '优化措辞和表达' },
  { id: 'expand', label: '扩写', icon: <Expand size={14} />, description: '扩展当前段落细节' },
  { id: 'condense', label: '精简', icon: <Shrink size={14} />, description: '压缩冗余内容' },
  { id: 'dialogue', label: '生成对话', icon: <MessageSquare size={14} />, description: '为当前场景生成对话' },
  { id: 'restyle', label: '改写风格', icon: <Palette size={14} />, description: '切换叙事风格' },
  { id: 'consistency', label: '一致性检查', icon: <Search size={14} />, description: '检查与已有内容的矛盾' },
]

export function CommandBar({ onClose }: CommandBarProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? COMMANDS.filter(c => c.label.includes(query) || c.description.includes(query))
    : COMMANDS

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Sparkles size={14} className="text-blue-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 AI 指令... (续写/润色/扩写/精简/对话/风格/检查)"
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder-zinc-600"
          />
          <kbd className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                i === selectedIndex ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400 hover:bg-white/5'
              }`}
              onClick={() => onClose()}
            >
              <span className={i === selectedIndex ? 'text-blue-400' : 'text-zinc-500'}>{cmd.icon}</span>
              <div>
                <div className="text-sm">{cmd.label}</div>
                <div className="text-xs text-zinc-600">{cmd.description}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">无匹配指令</div>
          )}
        </div>
      </div>
    </div>
  )
}
