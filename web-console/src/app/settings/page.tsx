'use client';

/**
 * 配置中心页面
 * 提供模型、管线、并发、Agent 连接四大分组的可视化配置界面
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/agent-store';

// ──────────────────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────────────────

/** 单个配置项 */
interface ConfigItem {
  key: string;
  value: string;
  encrypted: boolean;
  updated_at: string;
}

/** 页面使用的表单值（key → 当前输入值） */
type FormValues = Record<string, string>;

// ──────────────────────────────────────────────────────────
// 默认值（数据库无记录时使用）
// ──────────────────────────────────────────────────────────

const DEFAULTS: FormValues = {
  claude_api_key: '',
  gemini_api_key: '',
  claude_model: 'claude-opus-4-5',
  gemini_model: 'gemini-2.0-flash',
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
// 主页面组件
// ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const connect = useAgentStore((s) => s.connect);
  const connected = useAgentStore((s) => s.connected);

  // ── 工具函数：更新单个字段 ──
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
          next[item.key] = item.value;
        }
        setForm(next);
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
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <FieldRow
            id="claude_model"
            label="Claude 模型"
            value={form.claude_model}
            onChange={setField('claude_model')}
          />
          <FieldRow
            id="gemini_model"
            label="Gemini 模型"
            value={form.gemini_model}
            onChange={setField('gemini_model')}
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
