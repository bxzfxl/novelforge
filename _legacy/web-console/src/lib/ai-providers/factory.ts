import type { ProviderAdapter } from './types';
import { getModelTarget } from '@/lib/db/queries';
import { AdapterNotFoundError, TargetNotAvailableError } from './errors';

/** 全局适配器注册表，键为 `${provider}-${mode}` */
const adapters = new Map<string, ProviderAdapter>();

/** 将适配器注册到其支持的所有 provider+mode 组合下 */
export function registerAdapter(adapter: ProviderAdapter): void {
  for (const provider of adapter.supportedProviders) {
    const key = `${provider}-${adapter.mode}`;
    adapters.set(key, adapter);
  }
}

/** 通过 provider + mode 查找适配器 */
export function getAdapter(provider: string, mode: 'api' | 'cli'): ProviderAdapter {
  const key = `${provider}-${mode}`;
  const adapter = adapters.get(key);
  if (!adapter) {
    throw new AdapterNotFoundError(provider, mode);
  }
  return adapter;
}

/** 通过 targetId 查找适配器（先查 DB 获取 target 行） */
export function getAdapterForTarget(targetId: string): ProviderAdapter {
  const target = getModelTarget(targetId);
  if (!target) {
    throw new TargetNotAvailableError(targetId, 'target row not found in database');
  }
  return getAdapter(target.provider, target.mode);
}

/** 仅供测试：清空注册表 */
export function __clearAdapters(): void {
  adapters.clear();
}

/** 仅供测试：查看当前所有注册键 */
export function __listRegisteredKeys(): string[] {
  return Array.from(adapters.keys());
}
