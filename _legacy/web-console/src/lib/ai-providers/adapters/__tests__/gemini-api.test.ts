import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { GeminiAPIAdapter } from '../gemini-api';

describe('GeminiAPIAdapter', () => {
  let db: Database.Database;
  let adapter: GeminiAPIAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('gemini_api_key', 'test-gemini-key');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new GeminiAPIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('supports only google provider', () => {
    expect(adapter.supportedProviders).toEqual(['google']);
  });

  it('parses usageMetadata correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: 'gemini reply' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            cachedContentTokenCount: 30,
          },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.content).toBe('gemini reply');
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(50);
    expect(result.usage.cacheReadTokens).toBe(30);
  });

  it('passes API key in URL query param', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url.toString();
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedUrl).toContain('key=test-gemini-key');
  });

  it('maps assistant role to model', async () => {
    let capturedBody: Record<string, unknown> = {};
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        }),
        { status: 200 },
      );
    }) as typeof global.fetch;

    await adapter.execute({
      targetId: 'gemini-2.5-flash:api',
      operationId: 'writer.main',
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second' },
      ],
    });

    const contents = capturedBody.contents as Array<{ role: string }>;
    expect(contents[0].role).toBe('user');
    expect(contents[1].role).toBe('model');
    expect(contents[2].role).toBe('user');
  });
});
