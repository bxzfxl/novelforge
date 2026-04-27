import { describe, it, expect, vi } from 'vitest'
import { createProvider } from '@/main/ai/providers'

// Mock crypto to avoid real encryption dependency in provider constructors
vi.mock('@/main/ai/crypto', () => ({
  decryptApiKey: (key: string) => key,
  encryptApiKey: (key: string) => key,
}))

// Mock missing @google/genai package so the Google provider module can load
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    constructor(_opts: Record<string, unknown>) {}
    getGenerativeModel() {
      return {
        generateContent: async () => ({ response: { text: () => '' } }),
      }
    }
  },
}))

describe('createProvider', () => {
  const baseConfig = {
    id: 'test',
    provider: 'anthropic' as const,
    displayName: 'Test Model',
    apiKey: 'sk-test-key',
    modelId: 'claude-sonnet-4-6',
    tags: [],
    enabled: true,
  }

  it('should create AnthropicProvider for anthropic type', () => {
    const p = createProvider({ ...baseConfig, provider: 'anthropic' })
    expect(p).toBeDefined()
    expect(typeof p.chat).toBe('function')
    expect(typeof p.chatStream).toBe('function')
    expect(typeof p.models).toBe('function')
    expect(typeof p.validate).toBe('function')
  })

  it('should create GoogleProvider for google type', () => {
    const p = createProvider({ ...baseConfig, provider: 'google' })
    expect(p).toBeDefined()
    expect(typeof p.chat).toBe('function')
  })

  it('should create OpenAIProvider for openai type', () => {
    const p = createProvider({ ...baseConfig, provider: 'openai' })
    expect(p).toBeDefined()
    expect(typeof p.chat).toBe('function')
  })

  it('should create OpenAICompatibleProvider for openai-compatible type', () => {
    const p = createProvider({ ...baseConfig, provider: 'openai-compatible' })
    expect(p).toBeDefined()
    expect(typeof p.chat).toBe('function')
  })

  it('should create OpenAICompatibleProvider for custom type', () => {
    const p = createProvider({ ...baseConfig, provider: 'custom' })
    expect(p).toBeDefined()
    expect(typeof p.chat).toBe('function')
  })

  it('should throw for unknown provider type', () => {
    expect(() => createProvider({ ...baseConfig, provider: 'unknown' as any }))
      .toThrow(/Unknown provider type/)
  })
})
