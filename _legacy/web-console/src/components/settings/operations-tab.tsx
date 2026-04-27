'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSettingsStore, type OperationView } from '@/stores/settings-store';
import OperationCard from './operation-card';
import ModelSelect from './model-select';

const CATEGORY_LABELS: Record<string, string> = {
  project: '📁 项目初始化',
  lore: '📚 资料库',
  outline: '📋 大纲',
  showrunner: '🎬 制片人',
  writer: '✍️ 编剧室',
  review: '🔍 评审',
  context: '🧠 上下文',
};

export default function OperationsTab() {
  const operations = useSettingsStore((s) => s.operations);
  const targets = useSettingsStore((s) => s.targets);
  const setCategoryDefault = useSettingsStore((s) => s.setCategoryDefault);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // 按 category 分组
  const grouped = useMemo(() => {
    const map = new Map<string, OperationView[]>();
    for (const op of operations) {
      if (!map.has(op.category)) map.set(op.category, []);
      map.get(op.category)!.push(op);
    }
    return Array.from(map.entries()).sort((a, b) =>
      (CATEGORY_LABELS[a[0]] ?? a[0]).localeCompare(CATEGORY_LABELS[b[0]] ?? b[0]),
    );
  }, [operations]);

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <div className="space-y-3">
      {grouped.map(([category, ops]) => {
        const isCollapsed = collapsed.has(category);
        const categoryDefault = ops[0]?.categoryDefault;
        return (
          <section key={category} className="rounded-lg border border-stone-200 bg-stone-50">
            {/* 类别标题行 */}
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => toggle(category)}
                className="flex items-center gap-1 font-medium text-sm"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                {CATEGORY_LABELS[category] ?? category}
                <span className="text-xs text-stone-400">({ops.length})</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-stone-500 shrink-0">类别默认:</span>
                <div className="w-80">
                  <ModelSelect
                    targets={targets}
                    value={categoryDefault ?? null}
                    includeInherit={true}
                    inheritLabel="— 未设置 —"
                    onChange={(t) => void setCategoryDefault(category, t)}
                  />
                </div>
              </div>
            </div>

            {/* 操作列表 */}
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2">
                {ops.map((op) => (
                  <OperationCard key={op.id} op={op} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
