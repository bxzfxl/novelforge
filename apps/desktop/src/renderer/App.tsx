import { useState } from 'react'
import { StudioLayout } from '@/layouts/studio-layout'
import { WelcomePage } from '@/onboarding/welcome'
import { ModelSettingsPage } from '@/settings/model-settings'
import { GeneralSettingsPage } from '@/settings/general-settings'
import { ExportDialog } from '@/export/export-dialog'
import { useShortcuts } from '@/hooks/use-shortcuts'

type Page = 'welcome' | 'studio' | 'settings-models' | 'settings-general'

export function App() {
  const [page, setPage] = useState<Page>('welcome')
  const [exportOpen, setExportOpen] = useState(false)

  useShortcuts({
    settings: () => setPage('settings-models'),
    export: () => setExportOpen(true),
  })

  return (
    <div className="transition-opacity duration-150">
      {page === 'welcome' && (
        <WelcomePage onEnterStudio={() => setPage('studio')} />
      )}
      {page === 'studio' && (
        <StudioLayout
          onOpenSettings={() => setPage('settings-models')}
          onOpenExport={() => setExportOpen(true)}
        />
      )}
      {page === 'settings-models' && (
        <ModelSettingsPage onBack={() => setPage('studio')} />
      )}
      {page === 'settings-general' && (
        <GeneralSettingsPage onBack={() => setPage('studio')} />
      )}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}
