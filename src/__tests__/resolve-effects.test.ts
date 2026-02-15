import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const tmpEffects = resolve('/tmp/shade-mcp-test-resolve')

describe('resolveEffectIds', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  afterAll(() => {
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  it('returns effect_id as single-element array', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effect_id: 'synth/noise' }, tmpEffects)
    expect(ids).toEqual(['synth/noise'])
  })

  it('splits effects CSV', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effects: 'synth/noise, filter/blur' }, tmpEffects)
    expect(ids).toEqual(['synth/noise', 'filter/blur'])
  })

  it('prefers effects over effect_id when both given', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effect_id: 'synth/noise', effects: 'filter/blur' }, tmpEffects)
    expect(ids).toEqual(['filter/blur'])
  })

  it('auto-detects single effect when neither given', async () => {
    mkdirSync(resolve(tmpEffects, 'synth/noise'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'synth/noise/definition.json'), '{}')
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({}, tmpEffects)
    expect(ids).toEqual(['synth/noise'])
  })

  it('throws when no effect_id and multiple effects exist', async () => {
    mkdirSync(resolve(tmpEffects, 'synth/noise'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'synth/noise/definition.json'), '{}')
    mkdirSync(resolve(tmpEffects, 'filter/blur'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'filter/blur/definition.json'), '{}')
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    expect(() => resolveEffectIds({}, tmpEffects)).toThrow(/specify effect_id/)
  })

  it('auto-detects flat effect layout (effectsDir itself has definition.json)', async () => {
    mkdirSync(tmpEffects, { recursive: true })
    writeFileSync(resolve(tmpEffects, 'definition.json'), '{}')
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({}, tmpEffects)
    expect(ids).toHaveLength(1)
    // The ID should be the directory name
    expect(ids[0]).toBe('shade-mcp-test-resolve')
  })

  it('throws when no effect_id and no effects directory', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    expect(() => resolveEffectIds({}, tmpEffects)).toThrow()
  })
})
