import { useState, useRef, useEffect } from 'react'
import type { ViewMode } from '@/layouts/studio-layout'
import { EditorToolbar } from './toolbar'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EditorPanelProps {
  viewMode: ViewMode
  onCommandOpen: () => void
}

export function EditorPanel({ viewMode, onCommandOpen }: EditorPanelProps) {
  const [content, setContent] = useState('')
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
      <div className="h-full flex items-center justify-center bg-nf-bg">
        <div className="text-center text-nf-muted">
          <div className="text-lg mb-2 font-medium">指挥模式</div>
          <div className="text-sm text-nf-muted-light">管线步骤和 AI 输出将在此显示</div>
        </div>
      </div>
    )
  }

  if (viewMode === 'review') {
    return (
      <div className="h-full flex flex-col bg-nf-bg">
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-nf-border p-4">
            <div className="text-xs text-nf-muted-light mb-2 font-medium uppercase tracking-wide">修改前</div>
            <ScrollArea className="h-full">
              <pre className="text-sm text-nf-muted whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            </ScrollArea>
          </div>
          <div className="flex-1 p-4">
            <div className="text-xs text-nf-muted-light mb-2 font-medium uppercase tracking-wide">修改后</div>
            <ScrollArea className="h-full">
              <pre className="text-sm text-nf-text whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            </ScrollArea>
          </div>
        </div>
      </div>
    )
  }

  // Writing mode
  return (
    <div className="h-full flex flex-col bg-nf-bg">
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
            className="flex-1 w-full bg-transparent text-nf-text p-8 text-[17px] leading-[1.8] resize-none outline-none placeholder-nf-muted-light"
            placeholder="开始写作... (Ctrl+J 唤起 AI 指令)"
            spellCheck={false}
          />
        </div>
        {showPreview && (
          <>
            <div className="w-px bg-nf-border" />
            <div className="w-1/2 p-8 overflow-auto">
              <div className="prose text-sm leading-[1.8] whitespace-pre-wrap text-nf-text max-w-none">
                {content}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
