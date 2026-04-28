import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/ipc-client'

export function GeneralSettings() {
  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState('zh-CN')
  const [fontSize, setFontSize] = useState('17')

  useEffect(() => {
    (async () => {
      const settings = await api.settings.get()
      setTheme(settings.theme || 'light')
      setLanguage(settings.language || 'zh-CN')
      setFontSize(String(settings.fontSize || 17))
    })()
  }, [])

  return (
    <div className="space-y-3">
      {[
        {
          label: '主题',
          desc: '应用外观颜色方案',
          control: (
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          label: '语言',
          desc: '界面显示语言',
          control: (
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          label: '字体大小',
          desc: '编辑器正文字号',
          control: (
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['14', '15', '16', '17', '18', '20'].map(s => (
                  <SelectItem key={s} value={s}>{s}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
      ].map(({ label, desc, control }) => (
        <div key={label} className="flex items-center justify-between p-4 bg-white border border-nf-border rounded-xl">
          <div>
            <div className="text-sm font-medium text-nf-text">{label}</div>
            <div className="text-xs text-nf-muted-light mt-0.5">{desc}</div>
          </div>
          {control}
        </div>
      ))}
    </div>
  )
}

interface GeneralSettingsPageProps {
  onBack?: () => void
}

export function GeneralSettingsPage({ onBack }: GeneralSettingsPageProps) {
  return (
    <div className="h-screen flex flex-col bg-nf-bg text-nf-text">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-nf-border bg-white">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>← 返回</Button>
        )}
        <h1 className="text-lg font-semibold text-nf-text">通用设置</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <GeneralSettings />
        </div>
      </div>
    </div>
  )
}
