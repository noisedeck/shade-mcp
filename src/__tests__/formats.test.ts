import { describe, it, expect } from 'vitest'
import { parseDefinitionJson } from '../formats/index.js'

describe('parseDefinitionJson', () => {
  it('parses a minimal definition', () => {
    const json = {
      func: 'myEffect',
      name: 'My Effect',
      globals: {},
      passes: [{ program: 'main' }]
    }
    const def = parseDefinitionJson(json, '/test/effect')
    expect(def.func).toBe('myEffect')
    expect(def.format).toBe('json')
    expect(def.passes).toHaveLength(1)
    expect(def.passes[0].program).toBe('main')
    expect(def.effectDir).toBe('/test/effect')
  })

  it('parses globals with uniform specs', () => {
    const json = {
      func: 'test',
      globals: {
        speed: { type: 'float', uniform: 'u_speed', default: 1.0, min: 0, max: 10 }
      },
      passes: []
    }
    const def = parseDefinitionJson(json, '/test')
    expect(def.globals.speed).toBeDefined()
    expect(def.globals.speed.uniform).toBe('u_speed')
    expect(def.globals.speed.default).toBe(1.0)
    expect(def.globals.speed.min).toBe(0)
    expect(def.globals.speed.max).toBe(10)
  })

  it('parses tags and description', () => {
    const json = {
      func: 'test',
      description: 'A test effect',
      tags: ['noise', 'pattern'],
      globals: {},
      passes: []
    }
    const def = parseDefinitionJson(json, '/test')
    expect(def.description).toBe('A test effect')
    expect(def.tags).toEqual(['noise', 'pattern'])
  })
})
