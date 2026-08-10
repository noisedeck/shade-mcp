import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

// The analysis tools hand shader source to a model and interpret what comes
// back. These tests pin down what the model is allowed to influence.
vi.mock('../ai/provider.js', () => ({
  getAIProvider: () => ({ provider: 'test', model: 'test' }),
  callAI: vi.fn(),
  NO_AI_KEY_MESSAGE: 'No AI API key found.',
}))

import { callAI } from '../ai/provider.js'
import { analyzeBranching } from '../tools/analysis/branching.js'
import { checkAlgEquiv } from '../tools/analysis/alg-equiv.js'

const tmpEffects = resolve('/tmp/shade-mcp-test-ai-contract')
const effectDir = resolve(tmpEffects, 'synth/noise')

describe('analysis tools and untrusted model output', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(callAI).mockReset()
    rmSync(tmpEffects, { recursive: true, force: true })
    mkdirSync(resolve(effectDir, 'glsl'), { recursive: true })
    mkdirSync(resolve(effectDir, 'wgsl'), { recursive: true })
    writeFileSync(resolve(effectDir, 'glsl/main.glsl'), 'void main(){}')
    writeFileSync(resolve(effectDir, 'wgsl/main.wgsl'), 'fn main(){}')
    vi.stubEnv('SHADE_EFFECTS_DIR', tmpEffects)
  })

  afterAll(() => {
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  it('keeps its own branching verdict when the model returns a status field', async () => {
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({
      status: 'ok', // must not override the computed verdict
      shaders: [{
        file: 'main.glsl',
        opportunities: [
          { location: 'l1', description: 'd1', severity: 'high' },
          { location: 'l2', description: 'd2', severity: 'medium' },
        ],
      }],
      summary: 'two opportunities',
    }))

    const result = await analyzeBranching('synth/noise', 'webgl2')
    expect(result.status).toBe('warning')
  })

  it('keeps the program name it matched when the model returns its own', async () => {
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({
      program: 'attacker-supplied',
      parity: 'equivalent',
      confidence: 'high',
      notes: 'looks fine',
    }))

    const result = await checkAlgEquiv('synth/noise')
    expect(result.pairs[0].program).toBe('main')
  })
})
