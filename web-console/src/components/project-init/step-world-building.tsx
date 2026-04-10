'use client';

/**
 * Step 2: 世界观设定
 * Markdown 文本框，内容写入 lore/world/core-rules.md
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PLACEHOLDER = `请描述故事发生的世界基础设定，例如：

## 世界基础
- 时代背景：
- 地理环境：
- 社会结构：

## 核心规则 / 力量体系
-

## 重要地点
-

## 世界矛盾
- `;

export default function StepWorldBuilding() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">世界观设定</h2>
        <p className="text-sm text-muted-foreground">
          用 Markdown 格式描述故事世界，将写入{' '}
          <code className="text-xs bg-muted px-1 rounded">lore/world/core-rules.md</code>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="world">世界观内容</Label>
        <Textarea
          id="world"
          rows={20}
          value={form.world_building}
          onChange={(e) => updateForm({ world_building: e.target.value })}
          placeholder={PLACEHOLDER}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          此步骤可选，留空后续可在"资料库"页面继续补充
        </p>
      </div>
    </div>
  );
}
