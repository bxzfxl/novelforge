import { useState } from 'react'
import { StudioLayout } from '@/layouts/studio-layout'
import { WelcomePage } from '@/onboarding/welcome'
import { ModelSettingsPage } from '@/settings/model-settings'
import { GeneralSettingsPage } from '@/settings/general-settings'
import { useShortcuts } from '@/hooks/use-shortcuts'

type Page = 'welcome' | 'studio' | 'settings-models' | 'settings-general'

export function App() {
  const [page, setPage] = useState<Page>('welcome')

  useShortcuts({
    settings: () => setPage('settings-models'),
  })

  return (
    <div className="transition-opacity duration-150">
      {page === 'welcome' && (
        <WelcomePage onEnterStudio={() => setPage('studio')} />
      )}
      {page === 'studio' && (
        <StudioLayout onOpenSettings={() => setPage('settings-models')} />
      )}
      {page === 'settings-models' && (
        <ModelSettingsPage onBack={() => setPage('studio')} />
      )}
      {page === 'settings-general' && (
        <GeneralSettingsPage onBack={() => setPage('studio')} />
      )}
    </div>
  )
}
