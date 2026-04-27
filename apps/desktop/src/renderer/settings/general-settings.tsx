import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/ipc-client'

export function GeneralSettings() {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('zh-CN')
  const [fontSize, setFontSize] = useState('16')

  useEffect(() => {
    (async () => {
      const settings = await api.settings.get()
      setTheme(settings.theme || 'dark')
      setLanguage(settings.language || 'zh-CN')
      setFontSize(String(settings.fontSize || 16))
    })()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div>
          <div className="text-sm text-zinc-300">主题</div>
          <div className="text-xs text-zinc-600">应用外观颜色方案</div>
        </div>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-32 bg-zinc-950 border-zinc-700 text-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="dark">深色</SelectItem>
            <SelectItem value="light">浅色</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div>
          <div className="text-sm text-zinc-300">语言</div>
          <div className="text-xs text-zinc-600">界面显示语言</div>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-32 bg-zinc-950 border-zinc-700 text-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="zh-CN">简体中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div>
          <div className="text-sm text-zinc-300">字体大小</div>
          <div className="text-xs text-zinc-600">编辑器正文字号</div>
        </div>
        <Select value={fontSize} onValueChange={setFontSize}>
          <SelectTrigger className="w-32 bg-zinc-950 border-zinc-700 text-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {['14', '15', '16', '17', '18', '20'].map(s => (
              <SelectItem key={s} value={s}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface GeneralSettingsPageProps {
  onBack?: () => void
}

export function GeneralSettingsPage({ onBack }: GeneralSettingsPageProps) {
  return (
    <div className="h-screen flex flex-col bg-nf-bg text-nf-text">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-nf-border">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>← 返回</Button>
        )}
        <h1 className="text-lg font-semibold text-zinc-200">通用设置</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <GeneralSettings />
        </div>
      </div>
    </div>
  )
}
