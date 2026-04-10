import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../settings-store';

// 模拟 fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // 重置 store 状态
    useSettingsStore.setState({
      operations: [],
      targets: [],
      budget: null,
      loading: false,
      error: null,
    });
  });

  it('loadAll 成功时设置 operations / targets / budget', async () => {
    const mockOps = [{ id: 'op1', category: 'writer', displayName: '主笔', description: '', isEnabled: true }];
    const mockTargets = [{ id: 'claude-sonnet-4-6:api', displayName: 'Claude Sonnet', provider: 'anthropic', mode: 'api' }];
    const mockBudget = { id: 1, daily_budget_usd: 10, warn_threshold_pct: 80, soft_block_threshold_pct: 100, hard_block_threshold_pct: 120, fallback_target_id: null };

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ operations: mockOps }))
      .mockResolvedValueOnce(makeJsonResponse({ targets: mockTargets }))
      .mockResolvedValueOnce(makeJsonResponse({ budget: mockBudget }));

    await useSettingsStore.getState().loadAll();

    const state = useSettingsStore.getState();
    expect(state.operations).toEqual(mockOps);
    expect(state.targets).toEqual(mockTargets);
    expect(state.budget).toEqual(mockBudget);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadAll 失败时设置 error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await useSettingsStore.getState().loadAll();

    const state = useSettingsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('setEnabled 调用 PATCH /api/operations/:id 并重新加载', async () => {
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }))
      .mockResolvedValueOnce(makeJsonResponse({ operations: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ targets: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ budget: null }));

    await useSettingsStore.getState().setEnabled('op1', false);

    const [patchCall] = mockFetch.mock.calls;
    expect(patchCall[0]).toBe('/api/operations/op1');
    expect(patchCall[1]?.method).toBe('PATCH');
    const body = JSON.parse(patchCall[1]?.body as string) as unknown;
    expect(body).toMatchObject({ is_enabled: false });
  });

  it('setCategoryDefault 使用 snake_case 字段', async () => {
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }))
      .mockResolvedValueOnce(makeJsonResponse({ operations: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ targets: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ budget: null }));

    await useSettingsStore.getState().setCategoryDefault('writer', 'claude-sonnet-4-6:api');

    const [postCall] = mockFetch.mock.calls;
    expect(postCall[0]).toBe('/api/bindings/category');
    const body = JSON.parse(postCall[1]?.body as string) as unknown;
    expect(body).toMatchObject({ category: 'writer', target_id: 'claude-sonnet-4-6:api' });
  });

  it('setOverride 使用 snake_case 字段', async () => {
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }))
      .mockResolvedValueOnce(makeJsonResponse({ operations: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ targets: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ budget: null }));

    await useSettingsStore.getState().setOverride('writer.main', 'deepseek-chat:api');

    const [postCall] = mockFetch.mock.calls;
    expect(postCall[0]).toBe('/api/bindings/override');
    const body = JSON.parse(postCall[1]?.body as string) as unknown;
    expect(body).toMatchObject({ operation_id: 'writer.main', target_id: 'deepseek-chat:api' });
  });
});
