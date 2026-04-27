'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

interface Preset {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  estimatedCost100Chapters: string;
  requirements: string[];
  categoryDefaults: Record<string, string>;
  overrides: Record<string, string>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PresetModal({ open, onClose }: Props) {
  const applyPreset = useSettingsStore((s) => s.applyPreset);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/presets')
      .then((r) => r.json())
      .then((data: { presets: Preset[] }) => setPresets(data.presets))
      .catch(() => {/* 静默失败 */});
  }, [open]);

  if (!open) return null;

  async function handleApply(presetId: string) {
    try {
      await applyPreset(presetId);
      toast.success(`已应用预设: ${presets.find((p) => p.id === presetId)?.name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">选择预设配置</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {presets.map((p) => (
            <div key={p.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="text-sm text-stone-500 mt-1">{p.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{p.channelCount} 渠道</Badge>
                    <Badge variant="outline">{p.estimatedCost100Chapters}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
                    前置条件: {p.requirements.join(' / ')}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  <Button size="sm" onClick={() => void handleApply(p.id)} className="gap-1.5">
                    <Check className="size-3.5" />
                    应用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    {expanded === p.id ? '收起' : '详情'}
                  </Button>
                </div>
              </div>

              {expanded === p.id && (
                <div className="mt-3 pt-3 border-t space-y-2 text-xs font-mono">
                  <div>
                    <strong className="text-stone-500">类别默认:</strong>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(p.categoryDefaults).map(([cat, t]) => (
                        <li key={cat}>
                          {cat} → {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {Object.keys(p.overrides).length > 0 && (
                    <div>
                      <strong className="text-stone-500">覆盖:</strong>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(p.overrides).map(([op, t]) => (
                          <li key={op}>
                            {op} → {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
