import type { ModelConfig, AIChatProvider } from '@novelforge/shared'
import { AnthropicProvider } from './anthropic'
import { GoogleProvider } from './google'
import { OpenAIProvider } from './openai'
import { OpenAICompatibleProvider } from './openai-compatible'

export function createProvider(config: ModelConfig): AIChatProvider {
  switch (config.provider) {
    case 'anthropic': return new AnthropicProvider(config)
    case 'google': return new GoogleProvider(config)
    case 'openai': return new OpenAIProvider(config)
    case 'openai-compatible': return new OpenAICompatibleProvider(config)
    case 'custom': return new OpenAICompatibleProvider(config)
    default: throw new Error(`Unknown provider type: ${config.provider}`)
  }
}

export type { AIChatProvider }
