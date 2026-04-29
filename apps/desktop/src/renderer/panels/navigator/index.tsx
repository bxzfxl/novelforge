import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, ChevronRight, ChevronDown, BookOpen, FileText,
  Settings, Plus, MoreHorizontal, FolderOpen
} from 'lucide-react'

interface NavChapter {
  id: string
  title: string
  status: 'draft' | 'review' | 'done'
  wordCount: number
}

interface NavVolume {
  id: string
  title: string
  chapters: NavChapter[]
}

const MOCK_VOLUMES: NavVolume[] = [
  {
    id: 'v1', title: '第一卷 · 觉醒',
    chapters: [
      { id: 'c1', title: '第 1 章 命运的开端', status: 'done', wordCount: 3200 },
      { id: 'c2', title: '第 2 章 异变突生', status: 'draft', wordCount: 2800 },
      { id: 'c3', title: '第 3 章 初入宗门', status: 'draft', wordCount: 0 },
    ],
  },
  {
    id: 'v2', title: '第二卷 · 磨砺',
    chapters: [
      { id: 'c4', title: '第 4 章 试炼开始', status: 'draft', wordCount: 0 },
      { id: 'c5', title: '第 5 章 生死搏杀', status: 'draft', wordCount: 0 },
    ],
  },
]

const STATUS_STYLES: Record<string, string> = {
  draft:  'bg-[rgba(55,53,47,0.06)] text-[rgba(55,53,47,0.4)]',
  review: 'bg-[var(--color-nf-badge-bg)] text-[var(--color-nf-badge-text)]',
  done:   'bg-[rgba(15,123,108,0.08)] text-[var(--color-nf-green)]',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿', review: '审阅', done: '完成',
}

export function NavigationPanel() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ v1: true, v2: false })
  const [activeChapter, setActiveChapter] = useState('c1')

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const filtered = MOCK_VOLUMES.map(v => ({
    ...v,
    chapters: v.chapters.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(v => v.chapters.length > 0 || !search)

  return (
    <div className="h-full flex flex-col bg-nf-sidebar">
      {/* 项目标题 */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-5 h-5 rounded bg-[var(--color-nf-accent)] flex items-center justify-center flex-shrink-0">
          <BookOpen size={11} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold text-nf-text truncate flex-1">
          我的小说项目
        </span>
        <button className="p-0.5 rounded hover:bg-nf-hover text-nf-text-3 transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-2 pb-2">
        <div className="flex items-center gap-1.5 px-2 h-7 bg-nf-hover rounded text-xs text-nf-text-3">
          <Search size={12} />
          <input
            type="text"
            placeholder="搜索章节..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-nf-text placeholder:text-nf-text-3 text-[13px]"
          />
        </div>
      </div>

      {/* 卷/章树 */}
      <ScrollArea className="flex-1">
        <div className="px-1 pb-2">
          {filtered.map(vol => (
            <div key={vol.id} className="mb-0.5">
              {/* 卷标题 */}
              <button
                onClick={() => toggle(vol.id)}
                className="flex items-center gap-1 w-full px-2 py-1 rounded text-[13px] font-medium text-nf-text-2 hover:bg-nf-hover transition-colors group"
              >
                {expanded[vol.id]
                  ? <ChevronDown size={12} className="text-nf-text-3 flex-shrink-0" />
                  : <ChevronRight size={12} className="text-nf-text-3 flex-shrink-0" />
                }
                <FolderOpen size={13} className="text-nf-text-3 flex-shrink-0" />
                <span className="truncate">{vol.title}</span>
                <MoreHorizontal
                  size={14}
                  className="ml-auto text-nf-text-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                />
              </button>

              {/* 章节列表 */}
              {expanded[vol.id] && (
                <div className="ml-3">
                  {vol.chapters.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChapter(ch.id)}
                      className={`flex items-center gap-1.5 w-full px-2 py-1 rounded text-[13px] transition-colors group ${
                        activeChapter === ch.id
                          ? 'bg-nf-active text-nf-text font-medium'
                          : 'text-nf-text-2 hover:bg-nf-hover'
                      }`}
                    >
                      <FileText size={12} className="text-nf-text-3 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{ch.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[ch.status]} flex-shrink-0`}>
                        {STATUS_LABELS[ch.status]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 底部操作 */}
      <div className="border-t border-nf-divider px-1 py-1">
        <button className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-[13px] text-nf-text-2 hover:bg-nf-hover transition-colors">
          <Settings size={13} />
          <span>设置</span>
        </button>
      </div>
    </div>
  )
}
