import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA } from '@/lib/db/schema';
import { seedModelTargets } from '@/lib/db/seed-model-targets';
import * as dbModule from '@/lib/db/index';
import { EventEmitter } from 'node:events';

// 只 mock spawn，其余导出通过 importOriginal 透传
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  const mockSpawn = vi.fn();
  return {
    ...actual,
    default: { ...actual, spawn: mockSpawn },
    spawn: mockSpawn,
  };
});

import { spawn } from 'node:child_process';
import { ClaudeCLIAdapter } from '../claude-cli';

describe('ClaudeCLIAdapter', () => {
  let db: Database.Database;
  let adapter: ClaudeCLIAdapter;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    seedModelTargets(db);
    vi.spyOn(dbModule, 'getDb').mockReturnValue(db);
    adapter = new ClaudeCLIAdapter();
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    vi.mocked(spawn).mockReset();
  });

  function setupMockSpawn(stdout: string, exitCode = 0) {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: () => void;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = () => {};

    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>);

    // Emit async to let caller attach listeners
    setTimeout(() => {
      proc.stdout.emit('data', Buffer.from(stdout, 'utf8'));
      proc.emit('close', exitCode);
    }, 10);

    return proc;
  }

  it('wasCliMode is true and costUsd is 0', async () => {
    const streamJson =
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'hello from CLI' }] },
      }) +
      '\n' +
      JSON.stringify({
        type: 'result',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

    setupMockSpawn(streamJson, 0);

    const result = await adapter.execute({
      targetId: 'claude-opus-4-6:cli',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.wasCliMode).toBe(true);
    expect(result.costUsd).toBe(0);
    expect(result.content).toBe('hello from CLI');
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
  });

  it('parses cache tokens from stream-json result', async () => {
    const streamJson = JSON.stringify({
      type: 'result',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 80,
        cache_creation_input_tokens: 20,
      },
    });

    setupMockSpawn(streamJson, 0);

    const result = await adapter.execute({
      targetId: 'claude-opus-4-6:cli',
      operationId: 'writer.main',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.usage.cacheReadTokens).toBe(80);
    expect(result.usage.cacheWriteTokens).toBe(20);
  });

  it('rejects on non-zero exit code', async () => {
    setupMockSpawn('', 1);

    await expect(
      adapter.execute({
        targetId: 'claude-opus-4-6:cli',
        operationId: 'writer.main',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow();
  });
});
