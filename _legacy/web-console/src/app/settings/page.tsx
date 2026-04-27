'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import OperationsTab from '@/components/settings/operations-tab';
import CredentialsTab from '@/components/settings/credentials-tab';
import BudgetTab from '@/components/settings/budget-tab';
import PresetModal from '@/components/settings/preset-modal';

export default function SettingsPage() {
  const loadAll = useSettingsStore((s) => s.loadAll);
  const loading = useSettingsStore((s) => s.loading);
  const error = useSettingsStore((s) => s.error);
  const [presetOpen, setPresetOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">设置</h2>
          <p className="mt-1 text-sm text-stone-500">AI 操作配置、凭证管理、预算告警</p>
        </div>
        <Button onClick={() => setPresetOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Sparkles className="size-4" />
          应用预设
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-stone-500">加载中...</div>}

      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">🎯 操作配置</TabsTrigger>
          <TabsTrigger value="credentials">🔑 凭证管理</TabsTrigger>
          <TabsTrigger value="budget">📊 预算与告警</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-4">
          <OperationsTab />
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          <CredentialsTab />
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          <BudgetTab />
        </TabsContent>
      </Tabs>

      <PresetModal open={presetOpen} onClose={() => setPresetOpen(false)} />
    </div>
  );
}
