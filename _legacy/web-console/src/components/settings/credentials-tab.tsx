'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';

interface ProviderCred {
  provider: string;
  label: string;
  configKey: string;
}

const API_PROVIDERS: ProviderCred[] = [
  { provider: 'anthropic', label: 'Anthropic (Claude)', configKey: 'anthropic_api_key' },
  { provider: 'openai', label: 'OpenAI', configKey: 'openai_api_key' },
  { provider: 'google', label: 'Google (Gemini)', configKey: 'gemini_api_key' },
  { provider: 'deepseek', label: 'DeepSeek', configKey: 'deepseek_api_key' },
  { provider: 'alibaba', label: 'Alibaba (Qwen)', configKey: 'alibaba_api_key' },
  { provider: 'zhipu', label: 'Zhipu (GLM)', configKey: 'zhipu_api_key' },
  { provider: 'moonshot', label: 'Moonshot (Kimi)', configKey: 'moonshot_api_key' },
];

export default function CredentialsTab() {
  const detectAvailability = useSettingsStore((s) => s.detectAvailability);
  const refreshPricing = useSettingsStore((s) => s.refreshPricing);
  const targets = useSettingsStore((s) => s.targets);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: { data: Array<{ key: string; value: string }> }) => {
        const map: Record<string, string> = {};
        for (const r of data.data) {
          if (r.key.endsWith('_api_key')) map[r.key] = r.value;
        }
        setKeys(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveKey(configKey: string, value: string) {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [configKey]: value }),
    });
    toast.success(`${configKey} 已保存`);
    await detectAvailability();
  }

  async function handleRefreshPricing() {
    await refreshPricing();
    toast.success('定价表已刷新');
  }

  async function handleDetect() {
    toast.info('开始检测...');
    await detectAvailability();
    toast.success('检测完成');
  }

  if (loading) return <div className="text-sm text-stone-500">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* 顶部操作按钮 */}
      <div className="flex gap-2">
        <Button onClick={() => void handleDetect()} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          重新检测可用性
        </Button>
        <Button onClick={() => void handleRefreshPricing()} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          刷新定价表
        </Button>
      </div>

      {/* API 凭证列表 */}
      <section>
        <h3 className="font-medium mb-3">🌐 API 凭证</h3>
        <div className="space-y-3">
          {API_PROVIDERS.map((p) => {
            const keyValue = keys[p.configKey] ?? '';
            const isShown = shown[p.configKey] ?? false;
            const providerTargets = targets.filter((t) => t.provider === p.provider && t.mode === 'api');
            const anyAvailable = providerTargets.some((t) => t.available);

            return (
              <div key={p.provider} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">{p.label}</Label>
                  {anyAvailable ? (
                    <Badge className="bg-green-100 text-green-700">✓ 已配置</Badge>
                  ) : (
                    <Badge variant="outline" className="text-stone-500">✗ 未配置</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type={isShown ? 'text' : 'password'}
                    value={keyValue === '••••••••' ? '' : keyValue}
                    placeholder={keyValue === '••••••••' ? '（已保存，输入新值覆盖）' : 'sk-...'}
                    onChange={(e) => setKeys({ ...keys, [p.configKey]: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setShown({ ...shown, [p.configKey]: !isShown })
                    }
                  >
                    {isShown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void saveKey(p.configKey, keyValue)}
                    disabled={!keyValue || keyValue === '••••••••'}
                  >
                    保存
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CLI 检测 */}
      <section>
        <h3 className="font-medium mb-3">💻 CLI 检测</h3>
        <div className="space-y-3">
          {['claude', 'gemini'].map((cli) => {
            const cliTargets = targets.filter(
              (t) => t.mode === 'cli' && t.provider === (cli === 'claude' ? 'anthropic' : 'google'),
            );
            const available = cliTargets.some((t) => t.available);
            const reason = cliTargets.find((t) => !t.available)?.availabilityReason;
            return (
              <div key={cli} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">{cli} CLI</div>
                    {available ? (
                      <div className="text-xs text-green-600 mt-1">✓ 已检测到</div>
                    ) : (
                      <div className="text-xs text-stone-500 mt-1">{reason ?? '未检测到'}</div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void handleDetect()}>
                    重新检测
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
