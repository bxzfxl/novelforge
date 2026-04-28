import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { BasicInfoStep } from './steps/basic-info'
import { AiModelsStep } from './steps/ai-models'
import { ProtagonistStep } from './steps/protagonist'
import { WorldBuildingStep } from './steps/world-building'

const STEPS = ['基本信息', 'AI 模型', '主角设定', '世界观', '确认']

interface QuickWizardProps {
  onComplete: () => void
  onBack: () => void
}

export function QuickWizard({ onComplete, onBack }: QuickWizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Record<string, any>>({})

  const updateData = (key: string, value: any) => setData(d => ({ ...d, [key]: value }))

  const next = () => {
    if (step === STEPS.length - 1) {
      onComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const prev = () => {
    if (step === 0) onBack()
    else setStep(s => s - 1)
  }

  return (
    <div className="h-screen flex flex-col bg-nf-bg">
      {/* Progress bar */}
      <div className="px-8 py-4 border-b border-nf-border bg-white">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i < step ? 'bg-[#f0fdf4] text-green-600' :
                i === step ? 'bg-[#f2f9ff] text-[#0075de]' :
                'bg-[rgba(0,0,0,0.05)] text-nf-muted-light'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs ${i <= step ? 'text-nf-text font-medium' : 'text-nf-muted-light'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)] mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {step === 0 && <BasicInfoStep data={data} onChange={updateData} />}
          {step === 1 && <AiModelsStep data={data} onChange={updateData} />}
          {step === 2 && <ProtagonistStep data={data} onChange={updateData} />}
          {step === 3 && <WorldBuildingStep data={data} onChange={updateData} />}
          {step === 4 && <ConfirmStep data={data} />}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-8 py-4 border-t border-nf-border bg-white flex justify-between">
        <Button variant="ghost" onClick={prev}>
          <ChevronLeft size={14} className="mr-1" /> {step === 0 ? '返回' : '上一步'}
        </Button>
        <Button onClick={next}>
          {step === STEPS.length - 1 ? '进入工作室' : '下一步'} {step < STEPS.length - 1 && <ChevronRight size={14} className="ml-1" />}
        </Button>
      </div>
    </div>
  )
}

function ConfirmStep({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-nf-text">确认信息</h2>
      <div className="space-y-3">
        {data.title && <InfoRow label="书名" value={data.title} />}
        {data.author && <InfoRow label="作者" value={data.author} />}
        {data.genre && <InfoRow label="类型" value={data.genre} />}
        {data.protagonistName && <InfoRow label="主角" value={data.protagonistName} />}
        {data.synopsis && <InfoRow label="简介" value={data.synopsis} />}
      </div>
      <p className="text-xs text-nf-muted-light mt-4">点击"进入工作室"完成初始化。所有设置可后续在设置页面修改。</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 p-3 bg-nf-surface border border-nf-border rounded-lg">
      <span className="text-xs text-nf-muted w-16 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-nf-text">{value}</span>
    </div>
  )
}
