import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, FileText, Users, Globe, BookOpen } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon?: React.ReactNode
  children?: NavItem[]
}

const defaultNav: NavItem[] = [
  {
    id: 'outline', label: '大纲', icon: <FileText size={14} />,
    children: [
      { id: 'master-outline', label: '总纲' },
      { id: 'vol-1', label: '第一卷' },
    ],
  },
  {
    id: 'characters', label: '角色', icon: <Users size={14} />,
    children: [
      { id: 'protagonist', label: '主角' },
    ],
  },
  {
    id: 'world', label: '世界观', icon: <Globe size={14} />,
    children: [
      { id: 'core-rules', label: '核心规则' },
      { id: 'geography', label: '地理' },
      { id: 'factions', label: '势力' },
    ],
  },
  {
    id: 'manuscript', label: '成稿', icon: <BookOpen size={14} />,
    children: [],
  },
]

function TreeNode({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = item.children && item.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[rgba(0,0,0,0.04)] rounded text-sm transition-colors"
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded
            ? <ChevronDown size={12} className="text-nf-muted-light flex-shrink-0" />
            : <ChevronRight size={12} className="text-nf-muted-light flex-shrink-0" />
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        {item.icon && <span className="text-nf-muted flex-shrink-0">{item.icon}</span>}
        <span className="text-nf-text truncate">{item.label}</span>
      </div>
      {hasChildren && expanded && item.children!.map(child => (
        <TreeNode key={child.id} item={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function NavigationPanel() {
  return (
    <div className="h-full flex flex-col bg-nf-surface">
      <div className="px-3 py-2 border-b border-nf-border">
        <span className="text-xs font-semibold text-nf-muted uppercase tracking-wider">导航</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {defaultNav.map(item => (
            <TreeNode key={item.id} item={item} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
