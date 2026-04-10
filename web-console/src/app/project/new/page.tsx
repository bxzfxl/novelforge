'use client';

/**
 * /project/new — 小说项目初始化向导
 * 七步引导：基础信息 → 世界观 → 角色 → 风格 → 大纲 → 管线确认 → 完成
 */

import Link from 'next/link';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useProjectInitStore,
  TOTAL_STEPS,
} from '@/stores/project-init-store';
import WizardProgress from '@/components/project-init/wizard-progress';
import StepBasicInfo from '@/components/project-init/step-basic-info';
import StepWorldBuilding from '@/components/project-init/step-world-building';
import StepCharacters from '@/components/project-init/step-characters';
import StepStyle from '@/components/project-init/step-style';
import StepOutline from '@/components/project-init/step-outline';
import StepPipelineConfig from '@/components/project-init/step-pipeline-config';
import StepCompletion from '@/components/project-init/step-completion';

export default function ProjectNewPage() {
  const currentStep = useProjectInitStore((s) => s.currentStep);
  const form = useProjectInitStore((s) => s.form);
  const nextStep = useProjectInitStore((s) => s.nextStep);
  const prevStep = useProjectInitStore((s) => s.prevStep);
  const goToStep = useProjectInitStore((s) => s.goToStep);

  // ── 渲染对应步骤 ──
  const renderStep = () => {
    switch (currentStep) {
      case 0: return <StepBasicInfo />;
      case 1: return <StepWorldBuilding />;
      case 2: return <StepCharacters />;
      case 3: return <StepStyle />;
      case 4: return <StepOutline />;
      case 5: return <StepPipelineConfig />;
      case 6: return <StepCompletion />;
      default: return null;
    }
  };

  // ── Step 1 基础信息必填 ──
  const canProceed = currentStep !== 0 || Boolean(form.title && form.genre);

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold">新建小说项目</h1>
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <X className="size-4" />
            退出向导
          </Button>
        </Link>
      </div>

      {/* 进度条 */}
      <WizardProgress currentStep={currentStep} onJump={goToStep} />

      {/* 步骤内容（可滚动） */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">{renderStep()}</div>

      {/* 底部导航按钮（最后一步由 StepCompletion 自己管） */}
      {!isLastStep && (
        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            上一步
          </Button>
          <Button onClick={nextStep} disabled={!canProceed} className="gap-1.5">
            下一步
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
