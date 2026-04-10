'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row {
  day: string;
  total_cost: number;
  total_calls: number;
  total_tokens: number;
}

type Metric = 'cost' | 'tokens' | 'calls';

export default function TimeSeriesChart() {
  const [metric, setMetric] = useState<Metric>('cost');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch('/api/usage/timeseries?days=30')
      .then((r) => r.json())
      .then((data: { rows: Row[] }) => setRows(data.rows));
  }, []);

  const max = Math.max(
    ...rows.map((r) =>
      metric === 'cost' ? r.total_cost : metric === 'tokens' ? r.total_tokens : r.total_calls,
    ),
    1,
  );

  const getValue = (r: Row) =>
    metric === 'cost' ? r.total_cost : metric === 'tokens' ? r.total_tokens : r.total_calls;

  const format = (v: number) =>
    metric === 'cost'
      ? `$${v.toFixed(2)}`
      : metric === 'tokens'
        ? `${(v / 1000).toFixed(1)}k`
        : String(v);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">时间趋势（最近 30 天）</CardTitle>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="text-xs px-2 py-1 rounded border border-stone-200"
          >
            <option value="cost">成本</option>
            <option value="tokens">Tokens</option>
            <option value="calls">调用数</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">暂无数据</p>
        ) : (
          <div className="h-40 flex items-end gap-1">
            {rows.map((r) => {
              const value = getValue(r);
              const h = (value / max) * 100;
              return (
                <div
                  key={r.day}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 rounded-t relative group"
                  style={{ height: `${h}%`, minHeight: '2px' }}
                  title={`${r.day}: ${format(value)}`}
                >
                  <div className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-stone-800 text-white px-1.5 py-0.5 rounded">
                    {format(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
