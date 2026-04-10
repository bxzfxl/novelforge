'use client';

/**
 * Step 4: 写作风格
 * 选择叙事视角、整体基调，并填写风格细节
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { POV_OPTIONS, TONE_OPTIONS } from '@/lib/project-config';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function StepStyle() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">写作风格</h2>
        <p className="text-sm text-muted-foreground">
          将写入 <code className="text-xs bg-muted px-1 rounded">lore/style/voice.md</code>
        </p>
      </div>

      {/* 叙事视角 */}
      <div className="space-y-1.5">
        <Label htmlFor="pov">叙事视角</Label>
        <select
          id="pov"
          value={form.narrative_pov}
          onChange={(e) => updateForm({ narrative_pov: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {POV_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 整体基调 */}
      <div className="space-y-1.5">
        <Label htmlFor="tone">整体基调</Label>
        <select
          id="tone"
          value={form.tone}
          onChange={(e) => updateForm({ tone: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 风格细节 */}
      <div className="space-y-1.5">
        <Label htmlFor="style_voice">语言风格细节</Label>
        <Textarea
          id="style_voice"
          rows={10}
          value={form.style_voice}
          onChange={(e) => updateForm({ style_voice: e.target.value })}
          placeholder={`描述更具体的语言偏好，例如：\n- 叙述节奏：\n- 对白风格：\n- 描写密度：\n- 参考作品：\n- 禁忌与偏好：`}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
