'use client';

/**
 * 配置中心页面
 * 提供模型、管线、并发、Agent 连接四大分组的可视化配置界面
 * 模型配置支持多模型管理，每个厂商可添加多个模型条目
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

/** 模型条目 */
interface ModelEntry {
  id: string;          // 模型 ID，如 "claude-sonnet-4-6"
  name: string;        // 显示名称，如 "Claude Sonnet 4.6"
  provider: 'claude' | 'gemini';
  tags: string[];      // 用途标签：["主笔", "通用"]
  isDefault: boolean;  // 是否为该厂商的默认模型
}

/** 页面使用的表单值（key → 当前输入值） */
type FormValues = Record<string, string>;

// ──────────────────────────────────────────────────────────
// 预设模型列表（用于新安装时的默认值）
// ──────────────────────────────────────────────────────────

const DEFAULT_MODELS: ModelEntry[] = [
  // Claude 预设
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'claude', tags: ['主笔', '通用'], isDefault: true },
  { id: 'claude-opus-4-6',   name: 'Claude Opus 4.6',   provider: 'claude', tags: ['架构师', '决策'], isDefault: false },
  { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  provider: 'claude', tags: ['快速', '辅助'], isDefault: false },
  // Gemini 预设
  { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   provider: 'gemini', tags: ['审查', '通用'], isDefault: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', tags: ['快速', '辅助'], isDefault: false },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', tags: ['快速'], isDefault: false },
];

/** 非模型配置字段的默认值 */
const DEFAULTS: FormValues = {
  claude_api_key: '',
  gemini_api_key: '',
  checkpoint_interval: '10',
  chapter_word_min: '3000',
  chapter_word_max: '5000',
  max_retry: '3',
  max_claude_concurrent: '3',
  max_gemini_concurrent: '5',
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
  onChange: (field: keyof ModelEntry, value: string) => void;
  onDelete: () => void;
  onToggleDefault: () => void;
}) {
  // 标签输入：逗号分隔的字符串 ↔ string[]
  const tagsStr = entry.tags.join(', ');

  return (
    <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50/60 px-3 py-2">
      {/* 模型 ID */}
      <Input
        value={entry.id}
        onChange={(e) => onChange('id', e.target.value)}
        placeholder="模型 ID，如 claude-sonnet-4-6"
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
        value={tagsStr}
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
      {/* 删除按钮 */}
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
// 工具：某厂商的模型列表区块
// ──────────────────────────────────────────────────────────

function ProviderModelList({
  provider,
  label,
  models,
  onAdd,
  onChange,
  onDelete,
  onToggleDefault,
}: {
  provider: 'claude' | 'gemini';
  label: string;
  models: ModelEntry[];
  onAdd: () => void;
  onChange: (idx: number, field: keyof ModelEntry, value: string) => void;
  onDelete: (idx: number) => void;
  onToggleDefault: (idx: number) => void;
}) {
  // 按 provider 过滤出全局索引，方便回调
  return (
    <div className="rounded-lg border-2 border-dashed border-stone-200 p-4 space-y-3">
      {/* 厂商标题 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-7 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 text-xs"
        >
          + 添加{label}模型
        </Button>
      </div>

      {/* 表头说明 */}
      {models.length > 0 && (
        <div className="grid grid-cols-[2fr_1.5fr_1fr_60px_64px_28px] gap-2 px-3 text-[10px] text-stone-400">
          <span>模型 ID</span>
          <span>显示名称</span>
          <span>标签（逗号分隔）</span>
          <span>预览</span>
          <span>默认</span>
          <span />
        </div>
      )}

      {/* 模型条目列表 */}
      {models.length === 0 ? (
        <p className="py-4 text-center text-xs text-stone-400">
          暂无模型配置，点击上方按钮添加
        </p>
      ) : (
        <div className="space-y-2">
          {models.map((entry, localIdx) => (
            <ModelRow
              key={`${provider}-${localIdx}`}
              entry={entry}
              onChange={(field, value) => onChange(localIdx, field, value)}
              onDelete={() => onDelete(localIdx)}
              onToggleDefault={() => onToggleDefault(localIdx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 主页面组件
// ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [models, setModels] = useState<ModelEntry[]>(DEFAULT_MODELS);
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

        // 将数据库中的值合并到表单（保留 DEFAULTS 中未记录的默认值）
        const next: FormValues = { ...DEFAULTS };
        for (const item of json.data) {
          if (item.key !== 'models_config') {
            next[item.key] = item.value;
          }
        }
        setForm(next);

        // 单独解析 models_config 字段
        const modelsItem = json.data.find((d) => d.key === 'models_config');
        if (modelsItem?.value) {
          try {
            const parsed = JSON.parse(modelsItem.value) as ModelEntry[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setModels(parsed);
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
      // 将 models 序列化为 JSON 字符串，随表单一起提交
      const payload: FormValues = {
        ...form,
        models_config: JSON.stringify(models),
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
  // 模型列表操作辅助函数
  // ──────────────────────────────────────

  /** 按 provider 过滤并返回局部索引→全局索引的映射 */
  function getProviderModels(provider: 'claude' | 'gemini') {
    return models
      .map((m, globalIdx) => ({ m, globalIdx }))
      .filter(({ m }) => m.provider === provider);
  }

  /** 添加新模型条目 */
  function handleAdd(provider: 'claude' | 'gemini') {
    setModels((prev) => [
      ...prev,
      { id: '', name: '', provider, tags: [], isDefault: false },
    ]);
  }

  /**
   * 修改某 provider 下的第 localIdx 个条目的字段
   * tags 字段传入逗号分隔字符串，自动拆分为数组
   */
  function handleChange(
    provider: 'claude' | 'gemini',
    localIdx: number,
    field: keyof ModelEntry,
    value: string,
  ) {
    const providerModels = getProviderModels(provider);
    const globalIdx = providerModels[localIdx]?.globalIdx;
    if (globalIdx === undefined) return;

    setModels((prev) => {
      const next = [...prev];
      if (field === 'tags') {
        // 将逗号分隔字符串拆分为标签数组
        next[globalIdx] = {
          ...next[globalIdx],
          tags: value.split(',').map((t) => t.trim()).filter(Boolean),
        };
      } else {
        next[globalIdx] = { ...next[globalIdx], [field]: value };
      }
      return next;
    });
  }

  /** 删除某 provider 下第 localIdx 个条目 */
  function handleDelete(provider: 'claude' | 'gemini', localIdx: number) {
    const providerModels = getProviderModels(provider);
    const globalIdx = providerModels[localIdx]?.globalIdx;
    if (globalIdx === undefined) return;
    setModels((prev) => prev.filter((_, i) => i !== globalIdx));
  }

  /**
   * 切换默认模型：同一 provider 内只允许一个 isDefault=true
   * 若当前已是默认则取消，否则将同 provider 其他条目设为非默认
   */
  function handleToggleDefault(provider: 'claude' | 'gemini', localIdx: number) {
    const providerModels = getProviderModels(provider);
    const globalIdx = providerModels[localIdx]?.globalIdx;
    if (globalIdx === undefined) return;

    setModels((prev) => {
      const next = [...prev];
      const isCurrentlyDefault = next[globalIdx].isDefault;
      // 先将同 provider 所有条目设为非默认
      next.forEach((m, i) => {
        if (m.provider === provider) {
          next[i] = { ...m, isDefault: false };
        }
      });
      // 若原来不是默认，则设为默认
      if (!isCurrentlyDefault) {
        next[globalIdx] = { ...next[globalIdx], isDefault: true };
      }
      return next;
    });
  }

  // ──────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────

  const claudeModels = getProviderModels('claude').map(({ m }) => m);
  const geminiModels = getProviderModels('gemini').map(({ m }) => m);

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
        <CardContent className="px-6 pb-5 space-y-5">
          {/* API Key 区域 */}
          <div className="space-y-4">
            <FieldRow
              id="claude_api_key"
              label="Claude API Key"
              type="password"
              value={form.claude_api_key}
              onChange={setField('claude_api_key')}
            />
            <FieldRow
              id="gemini_api_key"
              label="Gemini API Key"
              type="password"
              value={form.gemini_api_key}
              onChange={setField('gemini_api_key')}
            />
          </div>

          <Separator className="bg-stone-100" />

          {/* Claude 模型列表 */}
          <ProviderModelList
            provider="claude"
            label="Claude"
            models={claudeModels}
            onAdd={() => handleAdd('claude')}
            onChange={(localIdx, field, value) =>
              handleChange('claude', localIdx, field, value)
            }
            onDelete={(localIdx) => handleDelete('claude', localIdx)}
            onToggleDefault={(localIdx) => handleToggleDefault('claude', localIdx)}
          />

          {/* Gemini 模型列表 */}
          <ProviderModelList
            provider="gemini"
            label="Gemini"
            models={geminiModels}
            onAdd={() => handleAdd('gemini')}
            onChange={(localIdx, field, value) =>
              handleChange('gemini', localIdx, field, value)
            }
            onDelete={(localIdx) => handleDelete('gemini', localIdx)}
            onToggleDefault={(localIdx) => handleToggleDefault('gemini', localIdx)}
          />
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

      {/* ── 3. 并发配置 ── */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">并发配置</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-4">
          <FieldRow
            id="max_claude_concurrent"
            label="Claude 最大并发数"
            type="number"
            value={form.max_claude_concurrent}
            onChange={setField('max_claude_concurrent')}
          />
          <FieldRow
            id="max_gemini_concurrent"
            label="Gemini 最大并发数"
            type="number"
            value={form.max_gemini_concurrent}
            onChange={setField('max_gemini_concurrent')}
          />
        </CardContent>
      </Card>

      {/* ── 4. Agent 连接 ── */}
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
