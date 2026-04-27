import { useEffect } from 'react'

interface ShortcutMap {
  [key: string]: (() => void) | ((arg: string) => void)
}

export function useShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      const key = `${mod ? 'Cmd+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toLowerCase()}`

      if (key === 'cmd+s') { e.preventDefault(); (shortcuts.save as () => void)?.() }
      if (key === 'cmd+j') { e.preventDefault(); (shortcuts.aiCommand as () => void)?.() }
      if (key === 'cmd+b') { e.preventDefault(); (shortcuts.bold as () => void)?.() }
      if (key === 'cmd+i') { e.preventDefault(); (shortcuts.italic as () => void)?.() }
      if (key === 'cmd+shift+f') { e.preventDefault(); (shortcuts.focusMode as () => void)?.() }
      if (key === 'cmd+shift+p') { e.preventDefault(); (shortcuts.togglePreview as () => void)?.() }
      if (key === 'cmd+n') { e.preventDefault(); (shortcuts.newProject as () => void)?.() }
      if (key === 'cmd+o') { e.preventDefault(); (shortcuts.openProject as () => void)?.() }
      if (key === 'cmd+,') { e.preventDefault(); (shortcuts.settings as () => void)?.() }
      if (key === 'cmd+w') { e.preventDefault(); (shortcuts.closeProject as () => void)?.() }
      if (key === 'cmd+shift+e') { e.preventDefault(); (shortcuts.export as () => void)?.() }
      if (key === 'cmd+1') { e.preventDefault(); (shortcuts.viewMode as (arg: string) => void)?.('writing') }
      if (key === 'cmd+2') { e.preventDefault(); (shortcuts.viewMode as (arg: string) => void)?.('command') }
      if (key === 'cmd+3') { e.preventDefault(); (shortcuts.viewMode as (arg: string) => void)?.('review') }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
