import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const tmpEffects = resolve('/tmp/shade-mcp-test-shared-index')

function writeEffect(id: string) {
  const dir = resolve(tmpEffects, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'definition.json'), JSON.stringify({
    func: id.split('/')[1],
    description: `${id} effect`,
    passes: [],
  }))
}

describe('shared effect index', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    rmSync(tmpEffects, { recursive: true, force: true })
    writeEffect('synth/noise')
    vi.stubEnv('SHADE_EFFECTS_DIR', tmpEffects)
  })

  afterEach(() => {
    vi.useRealTimers()
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  it('picks up an effect added after the first lookup', async () => {
    const { getSharedEffectIndex } = await import('../knowledge/shared-instances.js')

    expect((await getSharedEffectIndex()).list()).toHaveLength(1)

    writeEffect('synth/plasma')
    vi.useFakeTimers()
    vi.advanceTimersByTime(60_000)

    expect((await getSharedEffectIndex()).list()).toHaveLength(2)
  })

  it('serves concurrent callers a single build', async () => {
    const { getSharedEffectIndex } = await import('../knowledge/shared-instances.js')

    const [a, b] = await Promise.all([getSharedEffectIndex(), getSharedEffectIndex()])

    expect(a).toBe(b)
  })

  it('rebuilds immediately when invalidated', async () => {
    const { getSharedEffectIndex, invalidateSharedEffectIndex } =
      await import('../knowledge/shared-instances.js')

    expect((await getSharedEffectIndex()).list()).toHaveLength(1)

    writeEffect('filter/blur')
    invalidateSharedEffectIndex()

    expect((await getSharedEffectIndex()).list()).toHaveLength(2)
  })
})
