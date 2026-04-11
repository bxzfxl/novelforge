'use client';

/**
 * Step 4: 写作风格
 * 选择叙事视角、整体基调，并填写风格细节
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { POV_OPTIONS, TONE_OPTIONS } from '@/lib/project-config';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAiAssist } from '@/hooks/use-ai-assist';

export default function StepStyle() {
  const form = useProjectInitStore((s) => s.form);
  const updateForm = useProjectInitStore((s) => s.updateForm);
  const { run: runAi, loading: aiLoading } = useAiAssist();

  const handleAiAssist = async () => {
    const content = await runAi({
      operationId: 'project.brainstorm',
      systemPrompt:
        '你是一个网文文风设计师。根据用户提供的项目信息、世界观和角色，给出具体的语言风格细节建议，涵盖"叙述节奏"、"对白风格"、"描写密度"、"参考作品"、"禁忌与偏好"五个方面。直接输出 Markdown 列表，不要其他解释，不要包裹代码块。',
      userPrompt: `项目信息：
- 标题：${form.title || '（未填）'}
- 类型：${form.genre || '（未填）'}
- 视角：${form.narrative_pov}
- 基调：${form.tone}
- 一句话简介：${form.synopsis || '（未填）'}

## 世界观摘要
${(form.world_building || '（未填）').slice(0, 800)}

## 角色
${form.characters.map((c) => `- ${c.name}（${c.role}）：${c.personality}`).join('\n') || '（未填）'}`,
    });
    if (content) {
      updateForm({ style_voice: content });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">写作风格</h2>
          <p className="text-sm text-muted-foreground">
            将写入 <code className="text-xs bg-muted px-1 rounded">lore/style/voice.md</code>
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
