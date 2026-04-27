import { spawn } from 'node:child_process';
import type {
  ProviderAdapter,
  ExecuteParams,
  ExecuteResult,
  StreamChunk,
  AvailabilityCheckResult,
  Usage,
} from '../types';
import { ProviderAPIError } from '../errors';
import { getModelTarget, getConfig } from '@/lib/db/queries';

/**
 * Invokes local `gemini` CLI. Gemini CLI's usage output format is less
 * structured than Claude CLI — we best-effort parse common patterns,
 * fall back to zero token counts if not found. Cost is always 0.
 */
export class GeminiCLIAdapter implements ProviderAdapter {
  id = 'google-cli';
  mode = 'cli' as const;
  supportedProviders = ['google'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const cliPath = getConfig('gemini_cli_path') ?? 'gemini';
    return new Promise((resolve) => {
      try {
        const proc = spawn(cliPath, ['--version'], { shell: process.platform === 'win32' });
        let resolved = false;
        proc.on('close', (code) => {
          if (resolved) return;
          resolved = true;
          if (code === 0) resolve({ available: true });
          else resolve({ available: false, reason: `gemini --version exited ${code}` });
        });
        proc.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({ available: false, reason: err.message });
        });
      } catch (err) {
        resolve({ available: false, reason: err instanceof Error ? err.message : String(err) });
      }
    });
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('google', null, `Unknown target: ${params.targetId}`);

    const cliPath = getConfig('gemini_cli_path') ?? 'gemini';
    const promptParts: string[] = [];
    if (params.systemPrompt) promptParts.push(params.systemPrompt);
    for (const m of params.messages) promptParts.push(m.content);
    const prompt = promptParts.join('\n\n');

    return new Promise((resolve, reject) => {
      const proc = spawn(cliPath, ['-p', prompt, '--model', target.model_id], {
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        reject(new ProviderAPIError('google', null, `Spawn failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new ProviderAPIError(
              'google',
              code,
              stderr || `gemini CLI exited with code ${code}`,
            ),
          );
          return;
        }

        // Rough token estimate from character count (Gemini CLI doesn't always
        // expose usage). 4 chars ≈ 1 token for English, ~1.5 chars ≈ 1 token for Chinese.
        const approxTokens = Math.ceil(stdout.length / 3);
        const usage: Usage = {
          inputTokens: Math.ceil(prompt.length / 3),
          outputTokens: approxTokens,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        };

        resolve({
          content: stdout,
          usage,
          costUsd: 0,
          wasCliMode: true,
          finishReason: 'stop',
          rawResponse: stdout,
        });
      });

      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new ProviderAPIError('google', null, 'aborted'));
        });
      }
    });
  }

  async *stream(params: ExecuteParams): AsyncIterable<StreamChunk> {
    const result = await this.execute(params);
    yield { type: 'content', delta: result.content };
    yield { type: 'usage', usage: result.usage };
    yield { type: 'done' };
  }
}
