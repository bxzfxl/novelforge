'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row {
  operation_id?: string;
  target_id?: string;
  calls: number;
  total_input?: number;
  total_output?: number;
  total_cost: number;
}

type GroupBy = 'operation' | 'model';

export default function OperationBreakdown() {
  const [groupBy, setGroupBy] = useState<GroupBy>('operation');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/usage/by-operation?group_by=${groupBy}`)
      .then((r) => r.json())
      .then((data: { rows: Row[] }) => setRows(data.rows));
  }, [groupBy]);

  const total = rows.reduce((sum, r) => sum + r.total_cost, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            按{groupBy === 'operation' ? '操作' : '模型'}拆分
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('operation')}
              className={`text-xs px-2 py-1 rounded ${groupBy === 'operation' ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`}
            >
              按操作
            </button>
            <button
              onClick={() => setGroupBy('model')}
              className={`text-xs px-2 py-1 rounded ${groupBy === 'model' ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`}
            >
              按模型
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">暂无数据</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-500">
                <th className="text-left pb-2">{groupBy === 'operation' ? 'Operation' : 'Model'}</th>
                <th className="text-right pb-2">调用</th>
                <th className="text-right pb-2">成本</th>
                <th className="text-right pb-2">占比</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 font-mono text-xs">
                    {r.operation_id ?? r.target_id}
                  </td>
                  <td className="py-2 text-right">{r.calls}</td>
                  <td className="py-2 text-right">${r.total_cost.toFixed(4)}</td>
                  <td className="py-2 text-right text-stone-500">
                    {total > 0 ? ((r.total_cost / total) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
