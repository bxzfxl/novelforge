'use client';

/**
 * 向导进度条 — 显示步骤索引与当前位置
 */

import { Check } from 'lucide-react';
import { WIZARD_STEPS } from '@/stores/project-init-store';

interface WizardProgressProps {
  currentStep: number;
  onJump?: (step: number) => void;
}

export default function WizardProgress({ currentStep, onJump }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background">
      {WIZARD_STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const clickable = Boolean(onJump) && idx <= currentStep;

        return (
          <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(idx)}
              className={`
                flex items-center gap-2 shrink-0 transition-colors
                ${clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
              `}
              title={step.label}
            >
              {/* 圆点 */}
              <div
                className={`
                  flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0
                  ${isCompleted ? 'bg-amber-600 text-white' : ''}
                  ${isActive ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-1' : ''}
                  ${!isCompleted && !isActive ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? <Check className="size-3.5" /> : idx + 1}
              </div>
              {/* 标签 */}
              <span
                className={`
                  text-xs whitespace-nowrap
                  ${isActive ? 'text-amber-700 font-semibold' : ''}
                  ${isCompleted ? 'text-foreground' : ''}
                  ${!isCompleted && !isActive ? 'text-muted-foreground' : ''}
                `}
              >
                {step.label}
              </span>
            </button>
            {/* 连接线 */}
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${isCompleted ? 'bg-amber-500' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
