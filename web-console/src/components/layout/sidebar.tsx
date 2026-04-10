'use client';

/**
 * Sidebar — 左侧导航栏
 * 宽度 200px，分三组：主要、内容、系统
 * 高亮当前路由，品牌标识使用暖橙色
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Users,
  BookOpen,
  FileText,
  CheckSquare,
  Settings,
  Terminal,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────
// 导航项类型与数据
// ──────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: '主要',
    items: [
      { href: '/', label: '仪表盘', icon: LayoutDashboard },
      { href: '/pipeline', label: '管线', icon: GitBranch },
      { href: '/writers-room', label: '编剧室', icon: Users },
    ],
  },
  {
    title: '内容',
    items: [
      { href: '/lore', label: '资料库', icon: BookOpen },
      { href: '/manuscript', label: '稿件', icon: FileText },
      { href: '/checkpoints', label: '检查点', icon: CheckSquare },
    ],
  },
  {
    title: '系统',
    items: [
      { href: '/usage', label: '用量监控', icon: DollarSign },
      { href: '/settings', label: '配置', icon: Settings },
      { href: '/terminal', label: '终端', icon: Terminal },
    ],
  },
];

// ──────────────────────────────────────────────
// 单个导航项组件
// ──────────────────────────────────────────────

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-orange-50 text-orange-600'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-orange-600' : 'text-stone-500')}
      />
      {item.label}
    </Link>
  );
}

// ──────────────────────────────────────────────
// Sidebar 主组件
// ──────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  /**
   * 判断当前路由是否与导航项匹配
   * 根路由 "/" 精确匹配，其他使用前缀匹配
   */
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-[200px] shrink-0 flex-col border-r border-stone-200 bg-white">
      {/* 品牌标识 */}
      <div className="flex h-12 items-center gap-2 border-b border-stone-200 px-4">
        <span className="text-base font-bold tracking-tight" style={{ color: '#EA580C' }}>
          NovelForge
        </span>
      </div>

      {/* 导航分组 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {/* 分组标题 */}
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActive(item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
