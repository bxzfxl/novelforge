import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { AnthropicAPIAdapter } from '../anthropic-api';
import { ProviderAPIError } from '../../errors';

describe('AnthropicAPIAdapter', () => {
  let db: Database.Database;
  let adapter: AnthropicAPIAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    // Seed API key
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run('anthropic_api_key', 'sk-test-key');
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new AnthropicAPIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('detectAvailability returns true when key present', async () => {
    const result = await adapter.detectAvailability('claude-opus-4-6:api');
    expect(result.available).toBe(true);
  });

  it('detectAvailability returns false when key missing', async () => {
    db.prepare('DELETE FROM config WHERE key = ?').run('anthropic_api_key');
    const result = await adapter.detectAvailability('claude-opus-4-6:api');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('未配置');
  });

  it('execute posts to Anthropic API with correct body', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Hello world' }],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'claude-sonnet-4-6:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 100,
    });

    expect(result.content).toBe('Hello world');
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    // Sonnet pricing: 10 * $3/M + 5 * $15/M = $0.00003 + $0.000075 = $0.000105
    expect(result.costUsd).toBeCloseTo(0.000105, 6);
    expect(result.wasCliMode).toBe(false);
  });

  it('execute throws ProviderAPIError on 429', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('rate limit', { status: 429 });
    }) as typeof global.fetch;

    await expect(
      adapter.execute({
        targetId: 'claude-sonnet-4-6:api',
        operationId: 'writer.main',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow(ProviderAPIError);
  });

  it('execute counts cache read tokens correctly', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'cached response' }],
          usage: {
            input_tokens: 1000,
            output_tokens: 100,
            cache_read_input_tokens: 800,
          },
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof global.fetch;

    const result = await adapter.execute({
      targetId: 'claude-sonnet-4-6:api',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.usage.cacheReadTokens).toBe(800);
  });
});
