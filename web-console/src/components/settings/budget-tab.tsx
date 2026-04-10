'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ModelSelect from './model-select';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

export default function BudgetTab() {
  const budget = useSettingsStore((s) => s.budget);
  const targets = useSettingsStore((s) => s.targets);
  const updateBudget = useSettingsStore((s) => s.updateBudget);

  const [daily, setDaily] = useState(0);
  const [warn, setWarn] = useState(80);
  const [soft, setSoft] = useState(100);
  const [hard, setHard] = useState(120);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setDaily(budget.daily_budget_usd);
      setWarn(budget.warn_threshold_pct);
      setSoft(budget.soft_block_threshold_pct);
      setHard(budget.hard_block_threshold_pct);
      setFallback(budget.fallback_target_id);
    }
  }, [budget]);

  async function handleSave() {
    await updateBudget({
      daily_budget_usd: daily,
      warn_threshold_pct: warn,
      soft_block_threshold_pct: soft,
      hard_block_threshold_pct: hard,
      fallback_target_id: fallback,
    });
    toast.success('预算配置已保存');
  }

  if (!budget) return <div className="text-sm text-stone-500">加载中...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h3 className="font-medium">每日预算上限</h3>
        <div className="space-y-1.5">
          <Label htmlFor="daily">USD / 天</Label>
          <Input
            id="daily"
            type="number"
            step="0.01"
            min={0}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
          <p className="text-xs text-stone-500">💡 设为 0 表示无限制</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">告警阈值</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>预警 %</Label>
            <Input
              type="number"
              min={0}
              max={200}
              value={warn}
              onChange={(e) => setWarn(Number(e.target.value))}
            />
            <p className="text-xs text-stone-500">📢 顶部 banner</p>
          </div>
          <div className="space-y-1.5">
            <Label>软阻 %</Label>
            <Input
              type="number"
              min={0}
              max={200}
              value={soft}
              onChange={(e) => setSoft(Number(e.target.value))}
            />
            <p className="text-xs text-stone-500">⚠️ 确认框</p>
          </div>
          <div className="space-y-1.5">
            <Label>硬阻 %</Label>
            <Input
              type="number"
              min={0}
              max={200}
              value={hard}
              onChange={(e) => setHard(Number(e.target.value))}
            />
            <p className="text-xs text-stone-500">⛔ 拒绝调用</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">快照兜底模型</h3>
        <p className="text-xs text-stone-500">
          AI 操作失败时，用此模型生成人类可读的失败摘要（可为空）
        </p>
        <ModelSelect
          targets={targets.filter((t) => t.mode === 'api')}
          value={fallback}
          includeInherit={true}
          inheritLabel="— 不使用 AI 分析 —"
          onChange={setFallback}
        />
      </section>

      <Button onClick={() => void handleSave()} className="gap-2">
        <Save className="size-4" />
        保存
      </Button>
    </div>
  );
}
