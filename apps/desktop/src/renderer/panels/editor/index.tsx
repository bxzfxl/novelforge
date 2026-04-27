import { useState, useRef, useEffect } from 'react'
import type { ViewMode } from '@/layouts/studio-layout'
import { EditorToolbar } from './toolbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Eye, EyeOff } from 'lucide-react'

interface EditorPanelProps {
  viewMode: ViewMode
  onCommandOpen: () => void
}

export function EditorPanel({ viewMode, onCommandOpen }: EditorPanelProps) {
  const [content, setContent] = useState('# 新章节\n\n开始写作...\n')
  const [showPreview, setShowPreview] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const chineseChars = (content.match(/[一-鿿]/g) || []).length
    setWordCount(chineseChars)
  }, [content])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault()
      onCommandOpen()
    }
  }

  if (viewMode === 'command') {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">
          <div className="text-lg mb-2">指挥模式</div>
          <div className="text-sm">管线步骤和 AI 输出将在此显示</div>
        </div>
      </div>
    )
  }

  if (viewMode === 'review') {
    return (
      <div className="h-full flex flex-col bg-zinc-950">
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-nf-border p-4">
            <div className="text-xs text-zinc-500 mb-2">修改前</div>
            <ScrollArea className="h-full">
              <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono">{content}</pre>
            </ScrollArea>
          </div>
          <div className="flex-1 p-4">
            <div className="text-xs text-zinc-500 mb-2">修改后</div>
            <ScrollArea className="h-full">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{content}</pre>
            </ScrollArea>
          </div>
        </div>
      </div>
    )
  }

  // Writing mode
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <EditorToolbar
        wordCount={wordCount}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full bg-transparent text-zinc-200 p-6 font-serif text-base leading-relaxed resize-none outline-none placeholder-zinc-600"
            placeholder="开始写作... (Ctrl+J 唤起 AI 指令)"
            spellCheck={false}
          />
        </div>
        {showPreview && (
          <>
            <div className="w-px bg-nf-border" />
            <div className="w-1/2 p-6 overflow-auto">
              <div className="prose prose-invert prose-zinc text-sm leading-relaxed whitespace-pre-wrap font-serif text-zinc-300">
                {content}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
