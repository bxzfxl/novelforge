'use client';

import type { TargetView } from '@/stores/settings-store';

interface Props {
  targets: TargetView[];
  value: string | null;
  onChange: (targetId: string | null) => void;
  includeInherit?: boolean;
  inheritLabel?: string;
}

export default function ModelSelect({
  targets,
  value,
  onChange,
  includeInherit = false,
  inheritLabel = '继承类别默认',
}: Props) {
  const grouped = new Map<string, TargetView[]>();
  for (const t of targets) {
    const key = t.provider;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {includeInherit && <option value="">{inheritLabel}</option>}
      {Array.from(grouped.entries()).map(([provider, list]) => (
        <optgroup key={provider} label={provider}>
          {list.map((t) => {
            const tierBadge = t.tier === 'flagship' ? '★' : '';
            const modeBadge = t.mode === 'cli' ? ' [CLI]' : ' [API]';
            const priceLabel = t.mode === 'cli'
              ? '订阅制'
              : t.inputPricePer1M !== null
                ? `$${t.inputPricePer1M}/$${t.outputPricePer1M} per 1M`
                : '';
            return (
              <option key={t.id} value={t.id} disabled={!t.available}>
                {tierBadge} {t.displayName}{modeBadge} — {priceLabel}
                {!t.available ? ` (${t.availabilityReason ?? '不可用'})` : ''}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}
