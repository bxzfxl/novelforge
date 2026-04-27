'use client';

/**
 * Step 2: 世界观设定
 * Markdown 文本框，内容写入 lore/world/core-rules.md
 */

import { useProjectInitStore } from '@/stores/project-init-store';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAiAssist } from '@/hooks/use-ai-assist';

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
  const { run: runAi, loading: aiLoading } = useAiAssist();

  const handleAiAssist = async () => {
    const content = await runAi({
      operationId: 'project.brainstorm',
      systemPrompt:
        '你是一个网文世界观设计师。根据用户提供的项目基础信息，生成一份结构化的 Markdown 世界观设定文档，包含"世界基础"、"核心规则 / 力量体系"、"重要地点"、"世界矛盾"四个章节。直接输出 Markdown 内容，不要添加其他解释、不要包裹代码块标记。',
      userPrompt: `请为以下小说项目生成世界观设定：

- 标题：${form.title || '（未填）'}
- 类型：${form.genre || '（未填）'}
- 一句话简介：${form.synopsis || '（未填）'}
- 目标字数：${form.target_words}
${form.world_building ? `\n已有部分世界观（请在此基础上扩展或覆盖）：\n${form.world_building}` : ''}`,
    });
    if (content) {
      updateForm({ world_building: content });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">世界观设定</h2>
          <p className="text-sm text-muted-foreground">
            用 Markdown 格式描述故事世界，将写入{' '}
            <code className="text-xs bg-muted px-1 rounded">lore/world/core-rules.md</code>
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
