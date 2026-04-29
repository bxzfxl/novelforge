import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { BasicInfoStep } from './steps/basic-info'
import { AiModelsStep } from './steps/ai-models'
import { ProtagonistStep } from './steps/protagonist'
import { WorldBuildingStep } from './steps/world-building'
import { OutlineStep } from './steps/outline'
import { StyleGuideStep } from './steps/style-guide'

const CATEGORIES = ['基本信息', 'AI 模型', '主角', '配角', '世界观', '大纲', '风格']

interface AdvancedWizardProps {
  onComplete: () => void
  onBack: () => void
}

export function AdvancedWizard({ onComplete, onBack }: AdvancedWizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Record<string, any>>({})
  const updateData = (key: string, value: any) => setData(d => ({ ...d, [key]: value }))

  const next = () => {
    if (step === CATEGORIES.length - 1) onComplete()
    else setStep(s => s + 1)
  }
  const prev = () => { if (step === 0) onBack(); else setStep(s => s - 1) }

  return (
    <div className="h-screen flex flex-col bg-nf-bg">
      <div className="px-8 py-4 border-b border-nf-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                i < step ? 'bg-[var(--color-nf-green-50)] text-[var(--color-nf-green)]' :
                i === step ? 'bg-[var(--color-nf-badge-bg)] text-[var(--color-nf-accent)]' :
                'text-nf-muted-light'
              }`}>
                {i < step ? <Check size={10} className="inline mr-1" /> : null}
                {label}
              </div>
              {i < CATEGORIES.length - 1 && <div className="w-4 h-px bg-[rgba(0,0,0,0.08)]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {step === 0 && <BasicInfoStep data={data} onChange={updateData} isAdvanced />}
          {step === 1 && <AiModelsStep data={data} onChange={updateData} isAdvanced />}
          {step === 2 && <ProtagonistStep data={data} onChange={updateData} isAdvanced />}
          {step === 3 && <SupportingCharsStep data={data} onChange={updateData} />}
          {step === 4 && <WorldBuildingStep data={data} onChange={updateData} isAdvanced />}
          {step === 5 && <OutlineStep data={data} onChange={updateData} />}
          {step === 6 && <StyleGuideStep data={data} onChange={updateData} />}
        </div>
      </div>

      <div className="px-8 py-4 border-t border-nf-border bg-white flex justify-between">
        <Button variant="ghost" onClick={prev}><ChevronLeft size={14} className="mr-1" /> {step === 0 ? '返回' : '上一步'}</Button>
        <Button onClick={next}>{step === CATEGORIES.length - 1 ? '进入工作室' : '下一步'} {step < CATEGORIES.length - 1 && <ChevronRight size={14} className="ml-1" />}</Button>
      </div>
    </div>
  )
}

function SupportingCharsStep({ data, onChange }: { data: Record<string, any>; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-nf-text">配角设定</h2>
      <p className="text-sm text-nf-muted">暂设主要配角，后续可在角色管理中详细编辑。</p>
      <textarea
        className="nf-textarea h-32"
        placeholder="描述主要配角（姓名、角色定位、与主角关系）..."
        value={data.supportingChars || ''}
        onChange={e => onChange('supportingChars', e.target.value)}
      />
    </div>
  )
}
