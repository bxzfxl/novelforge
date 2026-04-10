import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import type { ProviderAdapter, ExecuteParams, ExecuteResult } from '../types';
import {
  registerAdapter,
  getAdapter,
  getAdapterForTarget,
  __clearAdapters,
} from '../factory';

function makeMockAdapter(providers: string[], mode: 'api' | 'cli'): ProviderAdapter {
  return {
    id: `mock-${providers.join(',')}-${mode}`,
    mode,
    supportedProviders: providers,
    async detectAvailability() {
      return { available: true };
    },
    async execute(_p: ExecuteParams): Promise<ExecuteResult> {
      return {
        content: 'mock',
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: 0,
        wasCliMode: mode === 'cli',
        finishReason: 'stop',
      };
    },
    async *stream(_p: ExecuteParams) {
      yield { type: 'done' as const };
    },
  };
}

describe('adapter factory', () => {
  beforeEach(() => {
    __clearAdapters();
  });

  it('registerAdapter + getAdapter roundtrip', () => {
    const adapter = makeMockAdapter(['anthropic'], 'api');
    registerAdapter(adapter);
    expect(getAdapter('anthropic', 'api').id).toBe(adapter.id);
  });

  it('single adapter can serve multiple providers', () => {
    const adapter = makeMockAdapter(['openai', 'deepseek', 'alibaba'], 'api');
    registerAdapter(adapter);
    expect(getAdapter('openai', 'api').id).toBe(adapter.id);
    expect(getAdapter('deepseek', 'api').id).toBe(adapter.id);
    expect(getAdapter('alibaba', 'api').id).toBe(adapter.id);
  });

  it('throws AdapterNotFoundError for unknown provider', () => {
    expect(() => getAdapter('unknown', 'api')).toThrow(/No adapter registered/);
  });

  it('api and cli are separate namespaces', () => {
    const apiAdapter = makeMockAdapter(['anthropic'], 'api');
    const cliAdapter = makeMockAdapter(['anthropic'], 'cli');
    registerAdapter(apiAdapter);
    registerAdapter(cliAdapter);

    expect(getAdapter('anthropic', 'api').id).toBe(apiAdapter.id);
    expect(getAdapter('anthropic', 'cli').id).toBe(cliAdapter.id);
  });
});

describe('getAdapterForTarget', () => {
  let db: Database.Database;

  beforeEach(() => {
    __clearAdapters();
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('resolves target ID to correct adapter', () => {
    const adapter = makeMockAdapter(['anthropic'], 'api');
    registerAdapter(adapter);
    const result = getAdapterForTarget('claude-opus-4-6:api');
    expect(result.id).toBe(adapter.id);
  });

  it('throws for unknown target', () => {
    expect(() => getAdapterForTarget('nonexistent:api')).toThrow(/not found/);
  });
});
