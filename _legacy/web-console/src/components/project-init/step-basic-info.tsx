'use client';

/**
 * Step 1: 基础信息
 * 收集小说标题、类型、字数目标、卷数、每章字数范围、一句话简介
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { GENRE_OPTIONS } from '@/lib/project-config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function StepBasicInfo() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">项目基础信息</h2>
        <p className="text-sm text-muted-foreground">
          这些信息将写入 <code className="text-xs bg-muted px-1 rounded">config/project.yaml</code>
        </p>
      </div>

      {/* 标题 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          小说标题 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => updateForm({ title: e.target.value })}
          placeholder="例：星河彼岸"
        />
      </div>

      {/* 类型 */}
      <div className="space-y-1.5">
        <Label htmlFor="genre">
          类型 / 题材 <span className="text-red-500">*</span>
        </Label>
        <select
          id="genre"
          value={form.genre}
          onChange={(e) => updateForm({ genre: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* 一句话简介 */}
      <div className="space-y-1.5">
        <Label htmlFor="synopsis">一句话简介</Label>
        <Textarea
          id="synopsis"
          rows={2}
          value={form.synopsis}
          onChange={(e) => updateForm({ synopsis: e.target.value })}
          placeholder="用一两句话概括你的故事核心"
        />
      </div>

      {/* 目标字数 + 卷数 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="target_words">目标字数</Label>
          <Input
            id="target_words"
            type="number"
            min={10000}
            step={10000}
            value={form.target_words}
            onChange={(e) => updateForm({ target_words: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            约 {(form.target_words / 10000).toFixed(0)} 万字
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="volumes">预计卷数</Label>
          <Input
            id="volumes"
            type="number"
            min={1}
            max={50}
            value={form.volumes}
            onChange={(e) => updateForm({ volumes: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            每卷约 {form.volumes > 0 ? Math.floor(form.target_words / form.volumes / 10000) : 0} 万字
          </p>
        </div>
      </div>

      {/* 每章字数范围 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="chapter_min">每章最小字数</Label>
          <Input
            id="chapter_min"
            type="number"
            min={500}
            step={100}
            value={form.chapter_min}
            onChange={(e) => updateForm({ chapter_min: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chapter_max">每章最大字数</Label>
          <Input
            id="chapter_max"
            type="number"
            min={500}
            step={100}
            value={form.chapter_max}
            onChange={(e) => updateForm({ chapter_max: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
