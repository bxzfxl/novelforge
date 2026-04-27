'use client';

/**
 * Step 3: 角色创建
 * 添加/删除/编辑角色卡片列表
 */

import { Plus, Trash2, User, Sparkles, Loader2 } from 'lucide-react';
import { useProjectInitStore } from '@/stores/project-init-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAiAssist } from '@/hooks/use-ai-assist';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

export default function StepCharacters() {
  const form = useProjectInitStore((s) => s.form);
  const characters = form.characters;
  const addCharacter = useProjectInitStore((s) => s.addCharacter);
  const updateCharacter = useProjectInitStore((s) => s.updateCharacter);
  const removeCharacter = useProjectInitStore((s) => s.removeCharacter);
  const { run: runAi, loading: aiLoading } = useAiAssist();

  const handleAiGenerateMain = async () => {
    // 用带前缀的纯文本格式而非 JSON：Claude 经常在 JSON 字符串值里塞直引号导致解析失败。
    // 用 "字段名: 值" 一行一段的格式最容易稳定解析，也方便 Claude 输出长段落。
    const content = await runAi({
      operationId: 'project.brainstorm',
      systemPrompt:
        '你是一个网文角色设计师。根据用户提供的项目信息和世界观，生成一个主角的完整角色卡。\n\n严格按以下格式输出（每个字段一行前缀，后续段落直接写在该行后面，字段之间不要空行、不要包裹代码块、不要额外解释）：\n\nNAME: 姓名\nROLE: 身份 / 定位\nPERSONALITY: 性格特征，一段话\nAPPEARANCE: 外貌描述，一段话\nBACKGROUND: 背景故事，一段话\nARC: 成长弧线，从……到……',
      userPrompt: `请为以下小说项目生成一个主角：

- 标题：${form.title || '（未填）'}
- 类型：${form.genre || '（未填）'}
- 一句话简介：${form.synopsis || '（未填）'}

## 世界观
${form.world_building || '（未填）'}`,
    });
    if (!content) return;
    // 解析 FIELD: value 格式，字段之间按下一个字段前缀截断
    const FIELDS = ['NAME', 'ROLE', 'PERSONALITY', 'APPEARANCE', 'BACKGROUND', 'ARC'] as const;
    const result: Record<string, string> = {};
    for (let i = 0; i < FIELDS.length; i++) {
      const cur = FIELDS[i];
      const next = FIELDS[i + 1];
      const startRe = new RegExp(`^\\s*${cur}\\s*[:：]\\s*`, 'm');
      const startMatch = content.match(startRe);
      if (!startMatch || startMatch.index === undefined) continue;
      const start = startMatch.index + startMatch[0].length;
      let end = content.length;
      if (next) {
        const endRe = new RegExp(`^\\s*${next}\\s*[:：]`, 'm');
        const endMatch = content.slice(start).match(endRe);
        if (endMatch && endMatch.index !== undefined) {
          end = start + endMatch.index;
        }
      }
      result[cur] = content.slice(start, end).trim();
    }
    if (!result.NAME) {
      toast.error('AI 返回的内容无法解析为角色卡，请重试或手动创建');
      return;
    }
    useProjectInitStore.setState((s) => ({
      form: {
        ...s.form,
        characters: [
          ...s.form.characters,
          {
            id: nanoid(8),
            name: result.NAME ?? '',
            role: result.ROLE ?? '',
            personality: result.PERSONALITY ?? '',
            appearance: result.APPEARANCE ?? '',
            background: result.BACKGROUND ?? '',
            arc: result.ARC ?? '',
          },
        ],
      },
    }));
    toast.success('已生成主角，向下滚动查看');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold mb-1">角色创建</h2>
          <p className="text-sm text-muted-foreground">
            为主要角色建卡，每个角色将生成独立的{' '}
            <code className="text-xs bg-muted px-1 rounded">lore/characters/*.md</code>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAiGenerateMain}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />
            )}
            {aiLoading ? '生成中…' : '🪄 AI 生成主角'}
          </Button>
          <Button onClick={addCharacter} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            添加角色
          </Button>
        </div>
      </div>

      {characters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <User className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              还没有角色，点击"添加角色"创建第一个
            </p>
            <p className="text-xs text-muted-foreground">
              此步骤可选，后续可在"资料库 → 角色"中继续添加
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {characters.map((char, idx) => (
            <Card key={char.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    角色 #{idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCharacter(char.id)}
                    className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    删除
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`name-${char.id}`} className="text-xs">
                      姓名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`name-${char.id}`}
                      value={char.name}
                      onChange={(e) =>
                        updateCharacter(char.id, { name: e.target.value })
                      }
                      placeholder="例：林远"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`role-${char.id}`} className="text-xs">
                      身份 / 定位
                    </Label>
                    <Input
                      id={`role-${char.id}`}
                      value={char.role}
                      onChange={(e) =>
                        updateCharacter(char.id, { role: e.target.value })
                      }
                      placeholder="例：主角 / 宗门外门弟子"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`personality-${char.id}`} className="text-xs">
                    性格特征
                  </Label>
                  <Textarea
                    id={`personality-${char.id}`}
                    rows={2}
                    value={char.personality}
                    onChange={(e) =>
                      updateCharacter(char.id, { personality: e.target.value })
                    }
                    placeholder="冷静、内敛、执拗……"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`appearance-${char.id}`} className="text-xs">
                    外貌描述
                  </Label>
                  <Textarea
                    id={`appearance-${char.id}`}
                    rows={2}
                    value={char.appearance}
                    onChange={(e) =>
                      updateCharacter(char.id, { appearance: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`background-${char.id}`} className="text-xs">
                    背景故事
                  </Label>
                  <Textarea
                    id={`background-${char.id}`}
                    rows={3}
                    value={char.background}
                    onChange={(e) =>
                      updateCharacter(char.id, { background: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`arc-${char.id}`} className="text-xs">
                    成长弧线
                  </Label>
                  <Textarea
                    id={`arc-${char.id}`}
                    rows={2}
                    value={char.arc}
                    onChange={(e) => updateCharacter(char.id, { arc: e.target.value })}
                    placeholder="从……到……的转变"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
