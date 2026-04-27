'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 基于推荐配置（Opus/Sonnet/DeepSeek 混合）的典型单次调用成本参考
const ESTIMATES: Array<{ label: string; approxCost: string }> = [
  { label: '写完一整章（全流水）', approxCost: '≈ $0.19' },
  { label: 'writer.main', approxCost: '≈ $0.02' },
  { label: 'writer.architect', approxCost: '≈ $0.06' },
  { label: 'writer.final_revise', approxCost: '≈ $0.08' },
  { label: 'project.brainstorm（一次）', approxCost: '≈ $0.30' },
  { label: 'outline.volume.plan（一卷）', approxCost: '≈ $0.50' },
  { label: 'context.l0.refresh', approxCost: '≈ $0.005' },
];

export default function PerOpEstimate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">每 Operation 估价参考</CardTitle>
        <p className="text-xs text-stone-500 mt-1">
          基于推荐配置（Opus/Sonnet/DeepSeek 混合）的典型单次调用成本
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {ESTIMATES.map((e) => (
            <div
              key={e.label}
              className="flex items-center justify-between px-3 py-2 rounded border border-stone-200"
            >
              <span className="text-stone-700">{e.label}</span>
              <span className="font-mono text-amber-700">{e.approxCost}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
