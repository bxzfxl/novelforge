'use client';

/**
 * Step 6: 管线配置确认
 * 展示当前管线参数与模型配置概要，提示用户可在"设置"中调整
 */

import Link from 'next/link';
import { Settings, ExternalLink } from 'lucide-react';
import { useProjectInitStore } from '@/stores/project-init-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StepPipelineConfig() {
  const form = useProjectInitStore((s) => s.form);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">管线配置确认</h2>
        <p className="text-sm text-muted-foreground">
          管线与模型的详细参数可在"设置"页面调整
        </p>
      </div>

      {/* 当前项目规模摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目规模</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="书名" value={form.title || '（未填写）'} />
          <Row label="类型" value={form.genre} />
          <Row label="目标字数" value={`${(form.target_words / 10000).toFixed(0)} 万字`} />
          <Row label="卷数" value={`${form.volumes} 卷`} />
          <Row label="每章字数" value={`${form.chapter_min} - ${form.chapter_max} 字`} />
          <Row label="预计总章数" value={`约 ${Math.floor(form.target_words / ((form.chapter_min + form.chapter_max) / 2))} 章`} />
        </CardContent>
      </Card>

      {/* 默认管线参数提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">默认管线参数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="检查点间隔" value="每 10 章" />
          <Row label="失败重试次数" value="3 次" />
          <Row label="L0 上下文自动刷新" value="每 3 章" />
          <Row label="情节偏离阈值" value="0.3" />
          <div className="pt-3 mt-3 border-t">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <Settings className="size-3" />
              去设置页调整
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        提示：当前使用默认管线参数。点击下方"下一步"继续，或先前往"设置"页调整后再返回。
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
