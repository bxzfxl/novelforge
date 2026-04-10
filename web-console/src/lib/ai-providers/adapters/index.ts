import { registerAdapter } from '../factory';
import { AnthropicAPIAdapter } from './anthropic-api';
import { OpenAICompatibleAdapter } from './openai-compatible';
import { GeminiAPIAdapter } from './gemini-api';
import { ClaudeCLIAdapter } from './claude-cli';
import { GeminiCLIAdapter } from './gemini-cli';

let registered = false;

/** Register all built-in adapters (idempotent). */
export function registerAllAdapters(): void {
  if (registered) return;
  registerAdapter(new AnthropicAPIAdapter());
  registerAdapter(new OpenAICompatibleAdapter());
  registerAdapter(new GeminiAPIAdapter());
  registerAdapter(new ClaudeCLIAdapter());
  registerAdapter(new GeminiCLIAdapter());
  registered = true;
}

/** 仅供测试：重置注册标志（配合 factory.__clearAdapters 使用）。 */
export function __resetRegisteredFlag(): void {
  registered = false;
}
