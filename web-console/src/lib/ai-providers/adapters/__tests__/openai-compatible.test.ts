import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { OpenAICompatibleAdapter } from '../openai-compatible';

describe('OpenAICompatibleAdapter', () => {
  let db: Database.Database;
  let adapter: OpenAICompatibleAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('deepseek_api_key', 'sk-deepseek-test');
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('alibaba_api_key', 'sk-alibaba-test');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new OpenAICompatibleAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('supports 5 providers', () => {
    expect(adapter.supportedProviders).toEqual([
      'openai',
      'deepseek',
      'alibaba',
      'zhipu',
      'moonshot',
    ]);
  });

  it('routes DeepSeek to correct endpoint', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('api.deepseek.com');
  });

  it('routes Alibaba to DashScope endpoint', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'qwen3-max:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('dashscope.aliyuncs.com');
  });

  it('passes API key in Authorization header', async () => {
    let capturedAuth = '';
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get('Authorization') ?? '';
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedAuth).toBe('Bearer sk-deepseek-test');
  });

  it('computes DeepSeek cost correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10000, completion_tokens: 5000 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'deepseek-chat:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    // DeepSeek: 10000 * $0.28/M + 5000 * $0.42/M = $0.0028 + $0.0021 = $0.0049
    expect(result.costUsd).toBeCloseTo(0.0049, 5);
  });

  it('detectAvailability returns false for missing key', async () => {
    db.prepare('DELETE FROM config WHERE key = ?').run('openai_api_key');
    const result = await adapter.detectAvailability('gpt-5.4:api');
    expect(result.available).toBe(false);
  });
});
