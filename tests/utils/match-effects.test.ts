import { describe, it, expect } from 'vitest'
import { matchEffects } from '../../src/tools/resolve-effects.js'

describe('matchEffects', () => {
  const allEffects = [
    'synth/noise', 'synth/plasma', 'synth/warp',
    'filter/blur', 'filter/edge',
    'classicNoisemaker/worms',
  ]

  it('matches exact effect ID', () => {
    expect(matchEffects(allEffects, 'synth/noise')).toEqual(['synth/noise'])
  })

  it('matches namespace wildcard', () => {
    expect(matchEffects(allEffects, 'synth/*')).toEqual(['synth/noise', 'synth/plasma', 'synth/warp'])
  })

  it('matches all with */*', () => {
    expect(matchEffects(allEffects, '*/*')).toEqual(allEffects)
  })

  it('returns empty for no match', () => {
    expect(matchEffects(allEffects, 'nonexistent/*')).toEqual([])
  })

  it('treats regex metacharacters in a pattern as literal text', () => {
    // "." must not stand in for "/" — only "*" is a wildcard here.
    expect(matchEffects(allEffects, 'synth.noise')).toEqual([])
  })

  it('does not compile a caller-supplied pattern as a regex', () => {
    expect(matchEffects(allEffects, '(synth|filter)/*')).toEqual([])
  })
})
