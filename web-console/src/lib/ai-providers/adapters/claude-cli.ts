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
 * Invokes local `claude` CLI in print+stream-json mode.
 * Parses the final `result` message for usage data. Cost is always 0.
 */
export class ClaudeCLIAdapter implements ProviderAdapter {
  id = 'anthropic-cli';
  mode = 'cli' as const;
  supportedProviders = ['anthropic'];

  async detectAvailability(_targetId: string): Promise<AvailabilityCheckResult> {
    const cliPath = getConfig('claude_cli_path') ?? 'claude';
    return new Promise((resolve) => {
      try {
        const proc = spawn(cliPath, ['--version'], { shell: process.platform === 'win32' });
        let resolved = false;
        proc.on('close', (code) => {
          if (resolved) return;
          resolved = true;
          if (code === 0) resolve({ available: true });
          else resolve({ available: false, reason: `claude --version exited with code ${code}` });
        });
        proc.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({ available: false, reason: err.message });
        });
      } catch (err) {
        resolve({
          available: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const target = getModelTarget(params.targetId);
    if (!target) throw new ProviderAPIError('anthropic', null, `Unknown target: ${params.targetId}`);

    const cliPath = getConfig('claude_cli_path') ?? 'claude';

    // Build the prompt: join system + messages into a single text
    const promptParts: string[] = [];
    if (params.systemPrompt) {
      promptParts.push(`[System]\n${params.systemPrompt}\n`);
    }
    for (const m of params.messages) {
      promptParts.push(`[${m.role}]\n${m.content}\n`);
    }
    const prompt = promptParts.join('\n');

    return new Promise((resolve, reject) => {
      const args = ['-p', prompt, '--model', target.model_id, '--output-format', 'stream-json', '--verbose'];
      const proc = spawn(cliPath, args, {
        shell: process.platform === 'win32',
        env: { ...process.env },
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
        reject(new ProviderAPIError('anthropic', null, `Spawn failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new ProviderAPIError(
              'anthropic',
              code,
              stderr || `claude CLI exited with code ${code}`,
            ),
          );
          return;
        }

        // Parse stream-json: one JSON object per line
        const lines = stdout.split('\n').filter((l) => l.trim());
        let content = '';
        let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'assistant' && obj.message?.content) {
              const parts = obj.message.content;
              if (Array.isArray(parts)) {
                for (const p of parts) {
                  if (p.type === 'text' && typeof p.text === 'string') content += p.text;
                }
              }
            }
            if (obj.type === 'result' && obj.usage) {
              usage = {
                inputTokens: obj.usage.input_tokens ?? 0,
                outputTokens: obj.usage.output_tokens ?? 0,
                cacheReadTokens: obj.usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: obj.usage.cache_creation_input_tokens ?? 0,
              };
            }
          } catch {
            // Skip non-JSON lines
          }
        }

        resolve({
          content,
          usage,
          costUsd: 0, // CLI mode = free
          wasCliMode: true,
          finishReason: 'stop',
          rawResponse: stdout,
        });
      });

      // Handle abort
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new ProviderAPIError('anthropic', null, 'aborted'));
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
