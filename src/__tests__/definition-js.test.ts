import { describe, it, expect, afterEach } from 'vitest'
import { parseDefinitionJs } from '../formats/index.js'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dirs: string[] = []

function writeDef(source: string): { file: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'shade-def-'))
  dirs.push(dir)
  const file = join(dir, 'definition.js')
  writeFileSync(file, source)
  return { file, dir }
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true })
})

describe('parseDefinitionJs', () => {
  it('parses basic fields', () => {
    const { file, dir } = writeDef(`export default {
      func: 'plasma',
      name: 'Plasma',
      namespace: 'synth',
      description: 'A plasma effect',
      globals: {},
      passes: [{ program: 'main' }],
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.func).toBe('plasma')
    expect(def.name).toBe('Plasma')
    expect(def.namespace).toBe('synth')
    expect(def.description).toBe('A plasma effect')
    expect(def.format).toBe('js')
    expect(def.passes).toEqual([{ program: 'main' }])
  })

  it('preserves apostrophes in name and description', () => {
    const { file, dir } = writeDef(`export default {
      func: 'life',
      name: "Conway's Game",
      description: "Don't truncate this text",
      globals: {},
      passes: [{ program: 'main' }],
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.name).toBe("Conway's Game")
    expect(def.description).toBe("Don't truncate this text")
  })

  it('parses globals specs that contain nested objects', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      globals: {
        mode: { type: 'int', uniform: 'u_mode', choices: { a: 0, b: 1 }, default: 2, min: 0, max: 5 },
        speed: { type: 'float', uniform: 'u_speed', default: 1, min: 0, max: 10 }
      },
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    // mode has a nested `choices` object before later keys
    expect(def.globals.mode).toBeDefined()
    expect(def.globals.mode.uniform).toBe('u_mode')
    expect(def.globals.mode.default).toBe(2)
    expect(def.globals.mode.max).toBe(5)
    // sibling spec after a nested object must still parse
    expect(def.globals.speed).toBeDefined()
    expect(def.globals.speed.uniform).toBe('u_speed')
    expect(def.globals.speed.max).toBe(10)
  })

  it('does not drop a spec whose uniform key follows a nested object', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      globals: {
        hue: { choices: { x: 1, y: 2 }, type: 'int', uniform: 'u_hue', default: 0 }
      },
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.globals.hue).toBeDefined()
    expect(def.globals.hue.uniform).toBe('u_hue')
  })

  it('still parses flat single-line globals specs (existing behavior)', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      globals: {
        speed: { type: 'float', uniform: 'u_speed', default: 1.0, min: 0, max: 10 }
      },
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.globals.speed.uniform).toBe('u_speed')
    expect(def.globals.speed.default).toBe(1.0)
    expect(def.globals.speed.min).toBe(0)
    expect(def.globals.speed.max).toBe(10)
  })

  it('parses multi-line globals specs (closing brace on its own line)', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      globals: {
        speed: {
          type: 'float',
          uniform: 'u_speed',
          default: 1.0,
          min: 0,
          max: 10
        }
      },
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.globals.speed.uniform).toBe('u_speed')
    expect(def.globals.speed.default).toBe(1.0)
    expect(def.globals.speed.max).toBe(10)
  })

  it('reads spec fields from the spec itself, not from a nested object', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      globals: {
        mode: { type: 'int', uniform: 'u_mode', choices: { min: 99, max: 1, default: 7 }, min: 0, max: 5, default: 2 }
      },
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.globals.mode.uniform).toBe('u_mode')
    expect(def.globals.mode.min).toBe(0)
    expect(def.globals.mode.max).toBe(5)
    expect(def.globals.mode.default).toBe(2)
  })

  it('unescapes an escaped quote inside a single-quoted value', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      name: 'Don\\'t Panic',
      globals: {},
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.name).toBe("Don't Panic")
  })

  it('does not match a value on a longer key (word boundary)', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      filename: 'palette.png',
      name: 'Real Name',
      globals: {},
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.name).toBe('Real Name')
  })

  it('returns undefined for an unterminated quoted value', () => {
    const { file, dir } = writeDef(`export default {
      func: 'x',
      name: 'unterminated
      description: 'ok',
      globals: {},
      passes: [{ program: 'main' }]
    }`)
    const def = parseDefinitionJs(file, dir)
    expect(def.name).toBeUndefined()
  })
})
