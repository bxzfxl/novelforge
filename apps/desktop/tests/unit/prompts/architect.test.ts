import { describe, it, expect } from 'vitest'
import { architectPrompt } from '@novelforge/prompts'

describe('Architect Prompt', () => {
  const baseOpts = {
    chapterBrief: 'Chapter 1: The Beginning',
    volumeOutline: 'Volume 1: Origins',
    contextL0: 'Global world-building context for the entire series',
    contextL1: 'Volume-specific character arcs and plot threads',
    styleGuide: 'Third person limited, past tense, literary prose',
  }

  it('should return a PromptTemplate with system prompt', () => {
    const result = architectPrompt(baseOpts)
    expect(result).toBeDefined()
    expect(typeof result.system).toBe('string')
    expect(result.system.length).toBeGreaterThan(0)
  })

  it('should return messages array with user role', () => {
    const result = architectPrompt(baseOpts)
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.messages.length).toBeGreaterThan(0)
    expect(result.messages[0].role).toBe('user')
    expect(typeof result.messages[0].content).toBe('string')
  })

  it('should include config with expected values', () => {
    const result = architectPrompt(baseOpts)
    expect(result.config).toBeDefined()
    expect(result.config.maxTokens).toBe(8000)
    expect(result.config.temperature).toBe(0.6)
  })

  it('should include all input fields in the user message', () => {
    const result = architectPrompt(baseOpts)
    const content = result.messages[0].content
    expect(content).toContain('Chapter 1: The Beginning')
    expect(content).toContain('Volume 1: Origins')
    expect(content).toContain('Global world-building context')
    expect(content).toContain('Volume-specific character arcs')
    expect(content).toContain('Third person limited')
  })

  it('should mention "场景划分" in the instruction section', () => {
    const result = architectPrompt(baseOpts)
    expect(result.messages[0].content).toContain('场景划分')
  })

  it('should also export other role prompts as functions', async () => {
    // Verify that other prompt exports are also importable functions
    const prompts = await import('@novelforge/prompts')
    const promptNames = [
      'mainWriterPrompt', 'characterAdvocatePrompt',
      'atmospherePrompt', 'criticPrompt', 'continuityPrompt',
      'revisePrompt', 'decidePrompt',
    ]
    for (const name of promptNames) {
      expect(typeof (prompts as any)[name]).toBe('function')
    }
  })
})
