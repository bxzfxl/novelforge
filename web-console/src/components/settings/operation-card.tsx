'use client';

import { useSettingsStore, type OperationView } from '@/stores/settings-store';
import ModelSelect from './model-select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  op: OperationView;
}

export default function OperationCard({ op }: Props) {
  const targets = useSettingsStore((s) => s.targets);
  const setOverride = useSettingsStore((s) => s.setOverride);
  const setEnabled = useSettingsStore((s) => s.setEnabled);

  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-stone-200 bg-white">
      {/* 启用/禁用开关 */}
      <div className="pt-1 shrink-0">
        <Switch
          checked={op.isEnabled}
          onCheckedChange={(v) => void setEnabled(op.id, v)}
          aria-label={`Toggle ${op.displayName}`}
        />
      </div>

      {/* 主内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{op.displayName}</span>
          <code className="text-xs text-stone-400 font-mono">{op.id}</code>
          {op.isOverridden && (
            <Badge variant="outline" className="text-xs">
              📌 已覆盖
            </Badge>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-2">{op.description}</p>
        {op.recommendedRationale && (
          <p className="text-xs text-amber-700 mb-2">💡 {op.recommendedRationale}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ModelSelect
              targets={targets}
              value={op.override}
              includeInherit={true}
              inheritLabel={
                op.categoryDefault
                  ? `继承类别 (${targets.find((t) => t.id === op.categoryDefault)?.displayName ?? op.categoryDefault})`
                  : '未配置 — 请设置类别默认或覆盖'
              }
              onChange={(targetId) => void setOverride(op.id, targetId)}
            />
          </div>
          {op.isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setOverride(op.id, null)}
              className="text-xs shrink-0"
            >
              清除覆盖
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
