'use client';

/**
 * 配置中心页面
 * 提供模型厂商、管线、Agent 连接三大分组的可视化配置界面
 * 模型配置支持任意数量的厂商，每个厂商可独立管理模型列表
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAgentStore } from '@/stores/agent-store';

// ──────────────────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────────────────

/** 单个配置项（数据库行） */
interface ConfigItem {
  key: string;
  value: string;
  encrypted: boolean;
  updated_at: string;
}

/** 单个模型条目 */
interface ModelEntry {
  id: string;           // 模型 ID，如 "gpt-4o"
  name: string;         // 显示名称，如 "GPT-4o"
  tags: string[];       // 用途标签，如 ["主笔", "通用"]
  isDefault: boolean;   // 是否为该厂商的默认模型
}

/** 模型厂商 */
interface ModelProvider {
  id: string;             // 唯一标识，如 "openai"
  name: string;           // 显示名称，如 "OpenAI"
  apiBase: string;        // API Base URL（留空则用默认）
  apiKeyConfigKey: string;// config 表中 API Key 的 key 名
  cliCommand: string;     // CLI 命令，如 "claude"；留空则通过 API 调用
  maxParallel: number;    // 最大并发数
  models: ModelEntry[];   // 该厂商下的模型列表
}

/** 页面表单值（key → 当前输入值） */
type FormValues = Record<string, string>;

// ──────────────────────────────────────────────────────────
// 预设厂商列表（首次加载时的默认值）
// ──────────────────────────────────────────────────────────

const DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    id: 'claude',
    name: 'Anthropic Claude',
    apiBase: '',
    apiKeyConfigKey: 'claude_api_key',
    cliCommand: 'claude',
    maxParallel: 3,
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tags: ['主笔', '通用'],    isDefault: true  },
      { id: 'claude-opus-4-6',   name: 'Claude Opus 4.6',   tags: ['架构师', '决策'],  isDefault: false },
      { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  tags: ['快速', '辅助'],    isDefault: false },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiBase: '',
    apiKeyConfigKey: 'gemini_api_key',
    cliCommand: 'gemini',
    maxParallel: 3,
    models: [
      { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   tags: ['审查', '通用'],   isDefault: true  },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tags: ['快速', '辅助'],   isDefault: false },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tags: ['快速'],           isDefault: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    apiKeyConfigKey: 'openai_api_key',
    cliCommand: '',
    maxParallel: 5,
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o',       tags: ['通用'],       isDefault: true  },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini',  tags: ['快速', '辅助'], isDefault: false },
      { id: 'o3-mini',     name: 'o3 Mini',       tags: ['推理'],       isDefault: false },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiBase: 'https://api.deepseek.com/v1',
    apiKeyConfigKey: 'deepseek_api_key',
    cliCommand: '',
    maxParallel: 5,
    models: [
      { id: 'deepseek-chat',     name: 'DeepSeek Chat',     tags: ['通用'], isDefault: true  },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', tags: ['推理'], isDefault: false },
    ],
  },
];

/** 管线/连接相关配置字段的默认值 */
const DEFAULTS: FormValues = {
  checkpoint_interval: '10',
  chapter_word_min: '3000',
  chapter_word_max: '5000',
  max_retry: '3',
  agent_url: 'http://localhost:9100',
};

// ──────────────────────────────────────────────────────────
// 工具：表单字段行
// ──────────────────────────────────────────────────────────

function FieldRow({
  id,
  label,
  type = 'text',
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: 'text' | 'password' | 'number';
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <Label htmlFor={id} className="text-right text-sm text-stone-600">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm"
        autoComplete="off"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 工具：单个模型条目行
// ──────────────────────────────────────────────────────────

function ModelRow({
  entry,
  onChange,
  onDelete,
  onToggleDefault,
}: {
  entry: ModelEntry;
  onChange: (field: 'id' | 'name' | 'tags', value: string) => void;
  onDelete: () => void;
  onToggleDefault: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50/60 px-3 py-2">
      {/* 模型 ID */}
      <Input
        value={entry.id}
        onChange={(e) => onChange('id', e.target.value)}
        placeholder="模型 ID，如 gpt-4o"
        className="h-8 flex-[2] text-xs font-mono"
      />
      {/* 显示名称 */}
      <Input
        value={entry.name}
        onChange={(e) => onChange('name', e.target.value)}
        placeholder="显示名称"
        className="h-8 flex-[1.5] text-xs"
      />
      {/* 标签（逗号分隔） */}
      <Input
        value={entry.tags.join(', ')}
        onChange={(e) => onChange('tags', e.target.value)}
        placeholder="标签，如 主笔, 通用"
        className="h-8 flex-[1] text-xs"
      />
      {/* 已解析的标签 Badge 预览 */}
      <div className="flex min-w-[60px] flex-wrap gap-1">
        {entry.tags.filter(Boolean).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="h-5 px-1.5 py-0 text-[10px] text-orange-700 bg-orange-50 border-orange-200"
          >
            {tag.trim()}
          </Badge>
        ))}
      </div>
      {/* 默认模型开关 */}
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={entry.isDefault}
          onCheckedChange={onToggleDefault}
          className="scale-75 data-[state=checked]:bg-orange-500"
        />
        <span className="text-[10px] text-stone-400 whitespace-nowrap">默认</span>
      </div>
      {/* 删除模型按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-7 w-7 shrink-0 p-0 text-stone-400 hover:text-red-500 hover:bg-red-50"
      >
        ×
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 工具：单个厂商 Card
// ──────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onProviderChange,
  onDeleteProvider,
  onAddModel,
  onModelChange,
  onModelDelete,
  onToggleDefault,
}: {
  provider: ModelProvider;
  onProviderChange: (field: keyof ModelProvider, value: string | number) => void;
  onDeleteProvider: () => void;
  onAddModel: () => void;
  onModelChange: (modelIdx: number, field: 'id' | 'name' | 'tags', value: string) => void;
  onModelDelete: (modelIdx: number) => void;
  onToggleDefault: (modelIdx: number) => void;
}) {
  return (
    <div className="rounded-lg border-2 border-dashed border-stone-200 p-4 space-y-4">
      {/* 厂商头部：名称 + 删除按钮 */}
      <div className="flex items-center justify-between">
        <Input
          value={provider.name}
          onChange={(e) => onProviderChange('name', e.target.value)}
          placeholder="厂商名称，如 OpenAI"
          className="h-8 max-w-[220px] text-sm font-semibold text-stone-800 border-transparent bg-transparent px-0 focus-visible:border-stone-300 focus-visible:bg-white focus-visible:px-3"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteProvider}
          className="h-7 w-7 p-0 text-stone-400 hover:text-red-500 hover:bg-red-50"
          title="删除该厂商"
        >
          ×
        </Button>
      </div>

      {/* 厂商信息：2 列 grid 布局 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {/* API Key */}
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">API Key</Label>
          <Input
            type="password"
            value={provider.apiKeyConfigKey}
            onChange={(e) => onProviderChange('apiKeyConfigKey', e.target.value)}
            placeholder="API Key"
            className="h-8 text-xs"
            autoComplete="off"
          />
        </div>
        {/* API Base URL */}
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">API Base URL</Label>
          <Input
            value={provider.apiBase}
            onChange={(e) => onProviderChange('apiBase', e.target.value)}
            placeholder="留空使用默认"
            className="h-8 text-xs font-mono"
          />
        </div>
        {/* CLI 命令 */}
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">CLI 命令</Label>
          <Input
            value={provider.cliCommand}
            onChange={(e) => onProviderChange('cliCommand', e.target.value)}
            placeholder="如 claude、gemini，留空则通过 API 调用"
            className="h-8 text-xs font-mono"
          />
        </div>
        {/* 最大并发数 */}
        <div className="space-y-1">
          <Label className="text-xs text-stone-500">最大并发数</Label>
          <Input
            type="number"
            value={String(provider.maxParallel)}
            onChange={(e) => onProviderChange('maxParallel', Number(e.target.value) || 1)}
            min={1}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <Separator className="bg-stone-100" />

      {/* 模型列表 */}
      <div className="space-y-3">
        {/* 表头（有模型时才显示） */}
        {provider.models.length > 0 && (
          <div className="grid grid-cols-[2fr_1.5fr_1fr_60px_64px_28px] gap-2 px-3 text-[10px] text-stone-400">
            <span>模型 ID</span>
            <span>显示名称</span>
            <span>标签（逗号分隔）</span>
            <span>预览</span>
            <span>默认</span>
            <span />
          </div>
        )}

        {provider.models.length === 0 ? (
          <p className="py-2 text-center text-xs text-stone-400">
            暂无模型，点击下方按钮添加
          </p>
        ) : (
          <div className="space-y-2">
            {provider.models.map((model, idx) => (
              <ModelRow
                key={idx}
                entry={model}
                onChange={(field, value) => onModelChange(idx, field, value)}
                onDelete={() => onModelDelete(idx)}
                onToggleDefault={() => onToggleDefault(idx)}
              />
            ))}
          </div>
        )}

        {/* 添加模型按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddModel}
          className="h-7 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 text-xs"
        >
          + 添加模型
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 主页面组件
// ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [providers, setProviders] = useState<ModelProvider[]>(DEFAULT_PROVIDERS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const connect = useAgentStore((s) => s.connect);
  const connected = useAgentStore((s) => s.connected);

  /** 更新单个 form 字段 */
  const setField = (key: string) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ── 初始化：从 /api/config 加载配置 ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data: ConfigItem[] };

        // 将数据库中的普通字段合并到表单
        const next: FormValues = { ...DEFAULTS };
        for (const item of json.data) {
          if (item.key !== 'providers_config') {
            next[item.key] = item.value;
          }
        }
        setForm(next);

        // 单独解析 providers_config 字段
        const providersItem = json.data.find((d) => d.key === 'providers_config');
        if (providersItem?.value) {
          try {
            const parsed = JSON.parse(providersItem.value) as ModelProvider[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProviders(parsed);
            }
          } catch {
            // JSON 解析失败时保持预设值
          }
        }
      } catch (err) {
        toast.error(`加载配置失败: ${String(err)}`);
      }
    }
    load();
  }, []);

  // ── 保存：PUT /api/config ──
  async function handleSave() {
    setSaving(true);
    try {
      // 将 providers 序列化为 JSON 字符串，随表单一起提交
      const payload: FormValues = {
        ...form,
        providers_config: JSON.stringify(providers),
      };

      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const result = await res.json() as { updated: number };
      toast.success(`配置已保存（${result.updated} 项更新）`);
    } catch (err) {
      toast.error(`保存失败: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  // ── 测试 Agent 连接 ──
  async function handleTestAgent() {
    setTesting(true);
    try {
      await connect(form.agent_url || undefined);
      toast.success('Agent 连接成功');
    } catch (err) {
      toast.error(`Agent 连接失败: ${String(err)}`);
    } finally {
      setTesting(false);
    }
  }

  // ──────────────────────────────────────
  // 厂商级操作
  // ──────────────────────────────────────

  /** 添加新厂商 */
  function handleAddProvider() {
    const newProvider: ModelProvider = {
      id: `provider_${Date.now()}`,
      name: '新厂商',
      apiBase: '',
      apiKeyConfigKey: '',
      cliCommand: '',
      maxParallel: 3,
      models: [],
    };
    setProviders((prev) => [...prev, newProvider]);
  }

  /** 删除厂商 */
  function handleDeleteProvider(providerIdx: number) {
    setProviders((prev) => prev.filter((_, i) => i !== providerIdx));
  }

  /** 修改厂商字段 */
  function handleProviderChange(
    providerIdx: number,
    field: keyof ModelProvider,
    value: string | number,
  ) {
    setProviders((prev) => {
      const next = [...prev];
      next[providerIdx] = { ...next[providerIdx], [field]: value };
      return next;
    });
  }

  // ──────────────────────────────────────
  // 模型级操作
  // ──────────────────────────────────────

  /** 在指定厂商下添加新模型 */
  function handleAddModel(providerIdx: number) {
    setProviders((prev) => {
      const next = [...prev];
      next[providerIdx] = {
        ...next[providerIdx],
        models: [
          ...next[providerIdx].models,
          { id: '', name: '', tags: [], isDefault: false },
        ],
      };
      return next;
    });
  }

  /**
   * 修改指定厂商下某个模型的字段
   * tags 字段传入逗号分隔字符串，自动拆分为数组
   */
  function handleModelChange(
    providerIdx: number,
    modelIdx: number,
    field: 'id' | 'name' | 'tags',
    value: string,
  ) {
    setProviders((prev) => {
      const next = [...prev];
      const models = [...next[providerIdx].models];
      if (field === 'tags') {
        models[modelIdx] = {
          ...models[modelIdx],
          tags: value.split(',').map((t) => t.trim()).filter(Boolean),
        };
      } else {
        models[modelIdx] = { ...models[modelIdx], [field]: value };
      }
      next[providerIdx] = { ...next[providerIdx], models };
      return next;
    });
  }

  /** 删除指定厂商下某个模型 */
  function handleModelDelete(providerIdx: number, modelIdx: number) {
    setProviders((prev) => {
      const next = [...prev];
      next[providerIdx] = {
        ...next[providerIdx],
        models: next[providerIdx].models.filter((_, i) => i !== modelIdx),
      };
      return next;
    });
  }

  /**
   * 切换指定厂商下某个模型的默认状态
   * 同厂商内只允许一个 isDefault=true
   */
  function handleToggleDefault(providerIdx: number, modelIdx: number) {
    setProviders((prev) => {
      const next = [...prev];
      const models = next[providerIdx].models.map((m, i) => ({
        ...m,
        // 先清除同厂商所有默认，再按条件设定
        isDefault: false,
      }));
      const wasDefault = next[providerIdx].models[modelIdx]?.isDefault ?? false;
      if (!wasDefault) {
        models[modelIdx] = { ...models[modelIdx], isDefault: true };
      }
      next[providerIdx] = { ...next[providerIdx], models };
      return next;
    });
  }

  // ──────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">配置中心</h2>
          <p className="mt-1 text-sm text-stone-500">管理系统运行参数与服务连接</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[88px]"
        >
          {saving ? '保存中…' : '保存配置'}
        </Button>
      </div>

      {/* ── 1. 模型配置 ── */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">模型配置</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-4">
          {/* 各厂商 Card 列表 */}
          {providers.map((provider, providerIdx) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onProviderChange={(field, value) =>
                handleProviderChange(providerIdx, field, value)
              }
              onDeleteProvider={() => handleDeleteProvider(providerIdx)}
              onAddModel={() => handleAddModel(providerIdx)}
              onModelChange={(modelIdx, field, value) =>
                handleModelChange(providerIdx, modelIdx, field, value)
              }
              onModelDelete={(modelIdx) => handleModelDelete(providerIdx, modelIdx)}
              onToggleDefault={(modelIdx) => handleToggleDefault(providerIdx, modelIdx)}
            />
          ))}

          {/* 添加模型厂商按钮 */}
          <Button
            variant="outline"
            onClick={handleAddProvider}
            className="w-full h-10 border-dashed border-stone-300 text-stone-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50"
          >
            + 添加模型厂商
          </Button>
        </CardContent>
      </Card>

      {/* ── 2. 管线配置 ── */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">管线配置</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-4">
          <FieldRow
            id="checkpoint_interval"
            label="检查点间隔（章）"
            type="number"
            value={form.checkpoint_interval}
            onChange={setField('checkpoint_interval')}
          />
          <FieldRow
            id="chapter_word_min"
            label="章节最少字数"
            type="number"
            value={form.chapter_word_min}
            onChange={setField('chapter_word_min')}
          />
          <FieldRow
            id="chapter_word_max"
            label="章节最多字数"
            type="number"
            value={form.chapter_word_max}
            onChange={setField('chapter_word_max')}
          />
          <FieldRow
            id="max_retry"
            label="最大重试次数"
            type="number"
            value={form.max_retry}
            onChange={setField('max_retry')}
          />
        </CardContent>
      </Card>

      {/* ── 3. Agent 连接 ── */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">Agent 连接</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-4">
          <FieldRow
            id="agent_url"
            label="Agent 地址"
            value={form.agent_url}
            onChange={setField('agent_url')}
          />
          <div className="flex items-center gap-3 pl-[196px]">
            <Button
              variant="outline"
              onClick={handleTestAgent}
              disabled={testing}
              className="min-w-[120px]"
            >
              {testing ? '连接中…' : '测试连接'}
            </Button>
            {/* 连接状态指示 */}
            <span className={`text-sm ${connected ? 'text-green-600' : 'text-stone-400'}`}>
              {connected ? '● 已连接' : '○ 未连接'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
