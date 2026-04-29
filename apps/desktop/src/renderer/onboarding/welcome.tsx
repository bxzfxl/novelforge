import { useState } from 'react'
import { BookOpen, Zap, Layers, ArrowRight } from 'lucide-react'
import { QuickWizard } from './quick-wizard'
import { AdvancedWizard } from './advanced-wizard'

interface WelcomePageProps {
  onEnterStudio: () => void
}

export function WelcomePage({ onEnterStudio }: WelcomePageProps) {
  const [mode, setMode] = useState<'choose' | 'quick' | 'advanced'>('choose')

  if (mode === 'quick')    return <QuickWizard    onComplete={onEnterStudio} onBack={() => setMode('choose')} />
  if (mode === 'advanced') return <AdvancedWizard onComplete={onEnterStudio} onBack={() => setMode('choose')} />

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white select-none">
      <div className="w-full max-w-[520px] px-6 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#f7f6f5] border border-[rgba(55,53,47,0.09)] flex items-center justify-center">
            <BookOpen size={24} className="text-[rgba(55,53,47,0.7)]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[rgb(55,53,47)] leading-tight mb-2">
          NovelForge
        </h1>
        <p className="text-[16px] text-[rgba(55,53,47,0.5)] mb-10 leading-relaxed">
          AI 驱动的小说工程化写作系统
        </p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => setMode('quick')}
            className="group relative p-6 bg-white border border-[rgba(55,53,47,0.1)] rounded-xl text-left hover:border-[rgba(55,53,47,0.18)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-[#fff8f0] flex items-center justify-center mb-4">
              <Zap size={16} className="text-[var(--color-nf-orange)]" />
            </div>
            <div className="text-[15px] font-semibold text-[rgb(55,53,47)] mb-1">快速初始化</div>
            <div className="text-[13px] text-[rgba(55,53,47,0.45)] leading-snug">5 步 · 约 5 分钟</div>
            <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgba(55,53,47,0.2)] group-hover:text-[rgba(55,53,47,0.4)] group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setMode('advanced')}
            className="group relative p-6 bg-white border border-[rgba(55,53,47,0.1)] rounded-xl text-left hover:border-[rgba(55,53,47,0.18)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-[#f0f8ff] flex items-center justify-center mb-4">
              <Layers size={16} className="text-[var(--color-nf-accent)]" />
            </div>
            <div className="text-[15px] font-semibold text-[rgb(55,53,47)] mb-1">高级初始化</div>
            <div className="text-[13px] text-[rgba(55,53,47,0.45)] leading-snug">7 类 · 15–30 分钟</div>
            <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgba(55,53,47,0.2)] group-hover:text-[rgba(55,53,47,0.4)] group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-[13px] text-[rgba(55,53,47,0.35)]">
          已有项目？
          <button
            onClick={onEnterStudio}
            className="text-[var(--color-nf-accent)] hover:underline underline-offset-2 ml-1"
          >
            直接进入工作室
          </button>
        </p>
      </div>
    </div>
  )
}
