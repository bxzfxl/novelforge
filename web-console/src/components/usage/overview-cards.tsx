'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Summary {
  today: number;
  week: number;
  month: number;
  total: number;
  cliSavedMonth: number;
}

export default function OverviewCards() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch('/api/usage/summary')
      .then((r) => r.json())
      .then(setSummary);
  }, []);

  if (!summary) return <div className="text-sm text-stone-500">加载中...</div>;

  const cards = [
    { label: '今日', value: summary.today },
    { label: '本周', value: summary.week },
    { label: '本月', value: summary.month },
    { label: '累计', value: summary.total },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-1.5">
                <DollarSign className="size-3.5" />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold text-stone-800">
                ${c.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.cliSavedMonth > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <TrendingDown className="size-4" />
          本月通过 CLI 模式节省:{' '}
          <strong>${summary.cliSavedMonth.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
}
