export function getNovelForgeAPI() {
  if (!(window as any).novelforge) {
    throw new Error('NovelForge API not available. Are you running inside Electron?')
  }
  return (window as any).novelforge
}

export const api = new Proxy({} as Record<string, any>, {
  get(_target, prop) {
    const nf = getNovelForgeAPI()
    return nf[prop]
  },
})
