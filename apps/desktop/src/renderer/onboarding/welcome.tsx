import { useState } from 'react'
import { BookOpen, Zap, Layers } from 'lucide-react'
import { QuickWizard } from './quick-wizard'
import { AdvancedWizard } from './advanced-wizard'

interface WelcomePageProps {
  onEnterStudio: () => void
}

export function WelcomePage({ onEnterStudio }: WelcomePageProps) {
  const [mode, setMode] = useState<'choose' | 'quick' | 'advanced'>('choose')

  if (mode === 'quick') return <QuickWizard onComplete={onEnterStudio} onBack={() => setMode('choose')} />
  if (mode === 'advanced') return <AdvancedWizard onComplete={onEnterStudio} onBack={() => setMode('choose')} />

  return (
    <div className="h-screen flex items-center justify-center bg-nf-bg">
      <div className="text-center max-w-2xl px-8">
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f9ff] flex items-center justify-center mx-auto mb-5">
            <BookOpen size={28} className="text-[#0075de]" />
          </div>
          <h1 className="text-3xl font-bold text-nf-text tracking-tight mb-2">NovelForge</h1>
          <p className="text-nf-muted text-base">AI 驱动的小说工程化写作系统</p>
        </div>

        <p className="text-nf-muted mb-8 text-sm">选择初始化方式，开始你的第一部小说</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('quick')}
            className="group p-6 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl hover:border-[#0075de]/40 hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_8px] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#fff9f0] flex items-center justify-center mb-4">
              <Zap size={18} className="text-[#dd5b00]" />
            </div>
            <h3 className="text-base font-semibold text-nf-text mb-1">快速初始化</h3>
            <p className="text-sm text-nf-muted">5 步 · 约 5 分钟</p>
            <p className="text-xs text-nf-muted-light mt-2 leading-relaxed">基本信息 + AI 模型 + 主角设定 + 世界观 → 开始写作</p>
          </button>

          <button
            onClick={() => setMode('advanced')}
            className="group p-6 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl hover:border-[#0075de]/40 hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_8px] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#f2f9ff] flex items-center justify-center mb-4">
              <Layers size={18} className="text-[#0075de]" />
            </div>
            <h3 className="text-base font-semibold text-nf-text mb-1">高级初始化</h3>
            <p className="text-sm text-nf-muted">7 类 · 15–30 分钟</p>
            <p className="text-xs text-nf-muted-light mt-2 leading-relaxed">完整世界观 + 配角 + 大纲 + 风格规范，打造专业级设定</p>
          </button>
        </div>

        <p className="mt-8 text-xs text-nf-muted-light">
          已有项目？
          <button onClick={onEnterStudio} className="text-[#0075de] hover:underline ml-1 underline-offset-2">
            直接进入工作室
          </button>
        </p>
      </div>
    </div>
  )
}
