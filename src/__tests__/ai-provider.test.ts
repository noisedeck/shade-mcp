import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('getAIProvider', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns null when no keys available', async () => {
    const { getAIProvider } = await import('../ai/provider.js')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider).toBeNull()
  })

  it('prefers anthropic when ANTHROPIC_API_KEY env is set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const { getAIProvider } = await import('../ai/provider.js')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider?.provider).toBe('anthropic')
    expect(provider?.apiKey).toBe('test-key')
  })

  it('falls back to openai when only OPENAI_API_KEY is set', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key')
    const { getAIProvider } = await import('../ai/provider.js')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider?.provider).toBe('openai')
  })

  it('anthropic env takes priority over openai env', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-key')
    vi.stubEnv('OPENAI_API_KEY', 'openai-key')
    const { getAIProvider } = await import('../ai/provider.js')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider?.provider).toBe('anthropic')
  })
})
