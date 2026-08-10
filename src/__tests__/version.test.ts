import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { VERSION } from '../version.js'

describe('advertised version', () => {
  it('matches the package version', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(resolve(here, '../../package.json'), 'utf-8'))
    expect(VERSION).toBe(pkg.version)
  })
})
