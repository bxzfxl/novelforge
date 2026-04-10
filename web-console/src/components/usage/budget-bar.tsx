'use client';

import { useEffect, useState } from 'react';

interface State {
  level: 'ok' | 'warn' | 'soft_block' | 'hard_block';
  pct?: number;
  budget?: number;
  todayCost?: number;
}

export default function BudgetBar() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('/api/budget/check?operation_id=writer.main')
        .then((r) => r.json())
        .then(setState);
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (!state || state.level === 'ok' || !state.pct) return null;

  const pct = Math.min(150, state.pct);
  const fillWidth = Math.min(100, pct);
  // 颜色映射：normal=绿, warn=黄, soft_block=橙, hard_block=红
  const color =
    state.level === 'hard_block'
      ? 'bg-red-500'
      : state.level === 'soft_block'
        ? 'bg-orange-500'
        : 'bg-yellow-400';

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-medium">今日预算使用</span>
        <span>
          ${state.todayCost?.toFixed(2)} / ${state.budget?.toFixed(2)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-stone-200 overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${fillWidth}%` }} />
        {/* 阈值标记线 */}
        <div className="absolute top-0 left-[80%] h-full w-0.5 bg-stone-500 opacity-30" />
        <div className="absolute top-0 left-[100%] h-full w-0.5 bg-stone-500 opacity-50" />
      </div>
      <div className="flex justify-between mt-1 text-xs text-stone-400">
        <span>[预警 80%]</span>
        <span>[软阻 100%]</span>
        <span>[硬阻 120%]</span>
      </div>
    </div>
  );
}
