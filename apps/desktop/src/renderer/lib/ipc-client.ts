export function getNovelForgeAPI() {
  return (window as any).novelforge ?? null
}

// 非 Electron 环境下返回空数据的 noop proxy，避免页面崩溃
const noopProxy: any = new Proxy(() => Promise.resolve({}), {
  get: () => noopProxy,
  apply: () => Promise.resolve({}),
})

export const api = new Proxy({} as Record<string, any>, {
  get(_target, prop) {
    const nf = getNovelForgeAPI()
    if (!nf) return noopProxy
    return nf[prop as string]
  },
})
