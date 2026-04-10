'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Snapshot {
  id: string;
  timestamp: string;
  operation_id: string;
  attempted_target_id: string;
  failure_category: string;
  failure_message: string;
  ai_summary: string | null;
  resume_hint: string | null;
  status: string;
}

export default function SnapshotsTable() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  async function load() {
    const res = await fetch('/api/snapshots?status=pending');
    const data = (await res.json()) as { snapshots: Snapshot[] };
    setSnapshots(data.snapshots);
  }

  useEffect(() => {
    void load();
  }, []);

  async function resume(id: string) {
    try {
      const res = await fetch(`/api/snapshots/${id}/resume`, { method: 'POST' });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error);
      toast.success('恢复成功');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function abandon(id: string) {
    await fetch(`/api/snapshots/${id}/abandon`, { method: 'POST' });
    toast.info('已放弃');
    void load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">失败与快照</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          <RefreshCw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">没有待处理的快照</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="rounded-md border border-stone-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-stone-500">
                        {s.operation_id}
                      </code>
                      <Badge
                        variant="outline"
                        className={
                          s.failure_category === 'transient'
                            ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                            : s.failure_category === 'permanent'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-stone-200 bg-stone-50'
                        }
                      >
                        {s.failure_category}
                      </Badge>
                    </div>
                    <div className="text-xs text-stone-500 mb-1">
                      {new Date(s.timestamp).toLocaleString('zh-CN')}
                      {' · '}
                      {s.attempted_target_id}
                    </div>
                    <div className="text-xs text-stone-700 line-clamp-2">
                      {s.failure_message}
                    </div>
                    {s.ai_summary && (
                      <div className="mt-1 text-xs text-blue-700 italic">
                        {s.ai_summary}
                      </div>
                    )}
                    {s.resume_hint && (
                      <div className="mt-1 text-xs text-green-700">
                        {s.resume_hint}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => void resume(s.id)} className="gap-1">
                      <RotateCw className="size-3" />
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void abandon(s.id)}
                      className="gap-1 text-red-500"
                    >
                      <Trash2 className="size-3" />
                      放弃
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
