import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, BookOpen, Zap, Layers } from 'lucide-react'
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
        <div className="mb-8">
          <BookOpen size={48} className="mx-auto text-blue-400 mb-4" />
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">NovelForge</h1>
          <p className="text-zinc-500">AI 驱动的小说工程化写作系统</p>
        </div>

        <p className="text-zinc-400 mb-10">选择初始化方式开始你的第一部小说</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('quick')}
            className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all text-left"
          >
            <Zap size={24} className="text-amber-400 mb-3" />
            <h3 className="text-lg font-semibold text-zinc-200 mb-1">快速初始化</h3>
            <p className="text-sm text-zinc-500">5 步 · ~5 分钟</p>
            <p className="text-xs text-zinc-600 mt-2">基本信息 + AI 模型 + 主角设定 + 世界观预览 → 开始写作</p>
          </button>

          <button
            onClick={() => setMode('advanced')}
            className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all text-left"
          >
            <Layers size={24} className="text-blue-400 mb-3" />
            <h3 className="text-lg font-semibold text-zinc-200 mb-1">高级初始化</h3>
            <p className="text-sm text-zinc-500">7 类 · 15-30 分钟</p>
            <p className="text-xs text-zinc-600 mt-2">完整世界观 + 配角 + 大纲 + 风格规范，打造专业级设定</p>
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-700">
          已有项目？<button onClick={onEnterStudio} className="text-blue-400 hover:underline ml-1">直接进入工作室</button>
        </p>
      </div>
    </div>
  )
}
