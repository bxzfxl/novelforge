'use client';

/**
 * Step 5: 大纲规划
 * Markdown 编辑器，内容写入 outline/master-outline.md
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function StepOutline() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);

  const placeholder = `## 第一卷：${form.title || '暂未命名'}
- 核心冲突：
- 主要情节线：
- 第 1-10 章：
- 第 11-20 章：
- 第 21-${form.volumes > 0 ? Math.floor(form.target_words / form.volumes / form.chapter_max) : 25} 章：

## 第二卷：
- 核心冲突：
- …
`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">大纲规划</h2>
        <p className="text-sm text-muted-foreground">
          按卷/章规划故事主线，将写入{' '}
          <code className="text-xs bg-muted px-1 rounded">outline/master-outline.md</code>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="outline">大纲内容</Label>
        <Textarea
          id="outline"
          rows={22}
          value={form.outline}
          onChange={(e) => updateForm({ outline: e.target.value })}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          此步骤可选，留空后续可在"资料库/大纲"继续补充。建议至少规划前 1-2 卷
        </p>
      </div>
    </div>
  );
}
