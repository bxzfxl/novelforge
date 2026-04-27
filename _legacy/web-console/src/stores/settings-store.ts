'use client';

import { create } from 'zustand';

// ── Types mirror API responses ────────────────────────────

export interface OperationView {
  id: string;
  category: string;
  displayName: string;
  description: string;
  recommendedTier: string | null;
  recommendedRationale: string | null;
  isEnabled: boolean;
  override: string | null;
  categoryDefault: string | null;
  effectiveTarget: {
    id: string;
    displayName: string;
    provider: string;
    mode: 'api' | 'cli';
  } | null;
  isOverridden: boolean;
}

export interface TargetView {
  id: string;
  modelId: string;
  provider: string;
  mode: 'api' | 'cli';
  displayName: string;
  description: string | null;
  inputPricePer1M: number | null;
  outputPricePer1M: number | null;
  cacheReadPricePer1M: number | null;
  contextWindow: number | null;
  tier: string | null;
  available: boolean;
  availabilityReason: string | null;
}

export interface BudgetView {
  id: number;
  daily_budget_usd: number;
  warn_threshold_pct: number;
  soft_block_threshold_pct: number;
  hard_block_threshold_pct: number;
  fallback_target_id: string | null;
}

interface SettingsState {
  operations: OperationView[];
  targets: TargetView[];
  budget: BudgetView | null;
  loading: boolean;
  error: string | null;
}

interface SettingsActions {
  loadAll: () => Promise<void>;
  setCategoryDefault: (category: string, targetId: string | null) => Promise<void>;
  setOverride: (operationId: string, targetId: string | null) => Promise<void>;
  setEnabled: (operationId: string, enabled: boolean) => Promise<void>;
  updateBudget: (patch: Partial<BudgetView>) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  detectAvailability: () => Promise<void>;
  refreshPricing: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  operations: [],
  targets: [],
  budget: null,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [opsRes, targetsRes, budgetRes] = await Promise.all([
        fetch('/api/operations'),
        fetch('/api/targets'),
        fetch('/api/budget'),
      ]);
      const ops = await opsRes.json() as { operations: OperationView[] };
      const targets = await targetsRes.json() as { targets: TargetView[] };
      const budget = await budgetRes.json() as { budget: BudgetView };
      set({
        operations: ops.operations,
        targets: targets.targets,
        budget: budget.budget,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  setCategoryDefault: async (category, targetId) => {
    await fetch('/api/bindings/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 实际路由使用 snake_case 字段
      body: JSON.stringify({ category, target_id: targetId }),
    });
    await get().loadAll();
  },

  setOverride: async (operationId, targetId) => {
    await fetch('/api/bindings/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 实际路由使用 snake_case 字段
      body: JSON.stringify({ operation_id: operationId, target_id: targetId }),
    });
    await get().loadAll();
  },

  setEnabled: async (operationId, enabled) => {
    await fetch(`/api/operations/${operationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    await get().loadAll();
  },

  updateBudget: async (patch) => {
    await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const res = await fetch('/api/budget');
    const data = await res.json() as { budget: BudgetView };
    set({ budget: data.budget });
  },

  applyPreset: async (presetId) => {
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: presetId }),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? 'Failed to apply preset');
    }
    await get().loadAll();
  },

  detectAvailability: async () => {
    await fetch('/api/targets/detect', { method: 'POST' });
    await get().loadAll();
  },

  refreshPricing: async () => {
    await fetch('/api/targets/refresh-pricing', { method: 'POST' });
    await get().loadAll();
  },
}));
