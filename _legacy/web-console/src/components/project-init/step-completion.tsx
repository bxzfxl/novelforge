'use client';

/**
 * Step 7: 完成
 * 最后一步：确认并提交，调用 /api/project/init 写入全部文件
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Rocket, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectInitStore } from '@/stores/project-init-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StepCompletion() {
  const router = useRouter();
  const form = useProjectInitStore((s) => s.form);
  const submitting = useProjectInitStore((s) => s.submitting);
  const setSubmitting = useProjectInitStore((s) => s.setSubmitting);
  const error = useProjectInitStore((s) => s.error);
  const setError = useProjectInitStore((s) => s.setError);
  const reset = useProjectInitStore((s) => s.reset);

  const [createdFiles, setCreatedFiles] = useState<string[] | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/project/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || '初始化失败');
      }
      setCreatedFiles(data.createdFiles);
      toast.success('项目初始化完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    reset();
    router.push('/');
  };

  const handleStartPipeline = () => {
    reset();
    router.push('/pipeline');
  };

  // ── 已完成状态 ──
  if (createdFiles) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold">项目初始化完成</h2>
          <p className="text-sm text-muted-foreground">
            《{form.title}》已就绪，可以开始写作了
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              已创建的文件 ({createdFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {createdFiles.map((file) => (
                <li key={file} className="flex items-center gap-2 text-xs font-mono">
                  <CheckCircle2 className="size-3 text-green-600 shrink-0" />
                  <code className="bg-muted px-1.5 py-0.5 rounded">{file}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleGoToDashboard}>
            返回仪表盘
          </Button>
          <Button onClick={handleStartPipeline} className="gap-2">
            <Rocket className="size-4" />
            去管线页启动
          </Button>
        </div>
      </div>
    );
  }

  // ── 确认提交状态 ──
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">确认并创建项目</h2>
        <p className="text-sm text-muted-foreground">
          点击下方按钮将所有内容写入磁盘
        </p>
      </div>

      {/* 提交前检查项 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">即将创建</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <CheckRow label="config/project.yaml" ok={Boolean(form.title)} />
          <CheckRow label="lore/world/core-rules.md" ok={form.world_building.length > 0} optional />
          <CheckRow
            label={`lore/characters/ (${form.characters.filter((c) => c.name).length} 个角色)`}
            ok={form.characters.some((c) => c.name.trim())}
            optional
          />
          <CheckRow label="lore/style/voice.md" ok={form.style_voice.length > 0} optional />
          <CheckRow label="outline/master-outline.md" ok={form.outline.length > 0} optional />
          <CheckRow label="lore/_context/L0-global-summary.md" ok />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!form.title && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>
            小说标题未填写，请先返回{' '}
            <Link href="#" onClick={(e) => { e.preventDefault(); useProjectInitStore.getState().goToStep(0); }} className="underline">
              基础信息
            </Link>{' '}
            步骤补充
          </span>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !form.title}
          size="lg"
          className="gap-2"
        >
          <Rocket className="size-4" />
          {submitting ? '创建中...' : '创建项目'}
        </Button>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  ok,
  optional,
}: {
  label: string;
  ok: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        className={`size-4 shrink-0 ${ok ? 'text-green-600' : 'text-muted-foreground/40'}`}
      />
      <code className="text-xs font-mono">{label}</code>
      {optional && !ok && (
        <span className="text-xs text-muted-foreground">(可选，留空)</span>
      )}
    </div>
  );
}
