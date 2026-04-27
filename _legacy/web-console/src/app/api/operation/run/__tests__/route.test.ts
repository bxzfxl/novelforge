/**
 * POST /api/operation/run 路由单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock runOperation 模块
vi.mock('@/lib/ai/run-operation', () => ({
  runOperation: vi.fn(),
}));

// mock registerAllAdapters（幂等，测试中不需要真实注册）
vi.mock('@/lib/ai-providers/adapters', () => ({
  registerAllAdapters: vi.fn(),
}));

import { POST } from '../route';
import { runOperation } from '@/lib/ai/run-operation';
import {
  OperationNotConfiguredError,
  OperationDisabledError,
  BudgetHardBlockedError,
  BudgetSoftBlockedError,
  OperationFailedError,
} from '@/lib/ai-providers/errors';

const mockRunOperation = vi.mocked(runOperation);

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/operation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/operation/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('400 — 无效 JSON body', async () => {
    const req = new Request('http://localhost/api/operation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Invalid JSON/);
  });

  it('400 — 缺少 operation_id', async () => {
    const res = await POST(makeRequest({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it('400 — 缺少 messages', async () => {
    const res = await POST(makeRequest({ operation_id: 'writer.main' }));
    expect(res.status).toBe(400);
  });

  it('200 — 成功返回结果', async () => {
    mockRunOperation.mockResolvedValue({
      content: 'Hello',
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.001,
      wasCliMode: false,
      finishReason: 'stop',
    });

    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.content).toBe('Hello');
    expect(json.costUsd).toBe(0.001);
  });

  it('400 — OperationNotConfiguredError', async () => {
    mockRunOperation.mockRejectedValue(new OperationNotConfiguredError('writer.main'));
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('NOT_CONFIGURED');
  });

  it('400 — OperationDisabledError', async () => {
    mockRunOperation.mockRejectedValue(new OperationDisabledError('writer.main'));
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('DISABLED');
  });

  it('402 — BudgetHardBlockedError', async () => {
    mockRunOperation.mockRejectedValue(new BudgetHardBlockedError(125, 10));
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.code).toBe('BUDGET_HARD_BLOCK');
  });

  it('402 — BudgetSoftBlockedError', async () => {
    mockRunOperation.mockRejectedValue(new BudgetSoftBlockedError(105, 10));
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.code).toBe('BUDGET_SOFT_BLOCK');
  });

  it('500 — OperationFailedError 含 snapshotId', async () => {
    mockRunOperation.mockRejectedValue(
      new OperationFailedError('writer.main', new Error('timeout'), 'snap123'),
    );
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('OPERATION_FAILED');
    expect(json.snapshotId).toBe('snap123');
  });

  it('500 — 未知错误', async () => {
    mockRunOperation.mockRejectedValue(new Error('something broke'));
    const res = await POST(makeRequest({
      operation_id: 'writer.main',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
