'use client';

/**
 * Step 5: 大纲规划
 * Markdown 编辑器，内容写入 outline/master-outline.md
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAiAssist } from '@/hooks/use-ai-assist';

export default function StepOutline() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);
  const { run: runAi, loading: aiLoading } = useAiAssist();

  const totalChapters = form.volumes > 0 && form.chapter_max > 0
    ? Math.max(1, Math.floor(form.target_words / form.volumes / form.chapter_max))
    : 25;

  const placeholder = `## 第一卷：${form.title || '暂未命名'}
- 核心冲突：
- 主要情节线：
- 第 1-10 章：
- 第 11-20 章：
- 第 21-${totalChapters} 章：

## 第二卷：
- 核心冲突：
- …
`;

  const handleAiAssist = async () => {
    const content = await runAi({
      operationId: 'project.brainstorm',
      systemPrompt:
        '你是一个网文大纲规划师。根据用户提供的项目信息、世界观、角色、风格，产出一份分卷/分章节骨架的 Markdown 大纲。每卷包含"核心冲突"、"主要情节线"和按章节范围的分段铺排。直接输出 Markdown 内容，不要其他解释、不要包裹代码块。',
      userPrompt: `请为以下项目规划大纲：

- 标题：${form.title || '（未填）'}
- 类型：${form.genre || '（未填）'}
- 目标字数：${form.target_words}
- 计划卷数：${form.volumes}
- 每章字数：${form.chapter_min}-${form.chapter_max}
- 一句话简介：${form.synopsis || '（未填）'}

## 世界观摘要
${(form.world_building || '（未填）').slice(0, 800)}

## 角色
${form.characters.map((c) => `- ${c.name}（${c.role}）：${c.personality}`).join('\n') || '（未填）'}

## 风格
${(form.style_voice || '（未填）').slice(0, 400)}`,
    });
    if (content) {
      updateForm({ outline: content });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">大纲规划</h2>
          <p className="text-sm text-muted-foreground">
            按卷/章规划故事主线，将写入{' '}
            <code className="text-xs bg-muted px-1 rounded">outline/master-outline.md</code>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAiAssist}
          disabled={aiLoading}
          className="shrink-0"
        >
          {aiLoading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />
          )}
          {aiLoading ? 'AI 生成中…' : '🪄 让 AI 帮我想'}
        </Button>
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
