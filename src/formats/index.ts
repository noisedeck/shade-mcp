import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDefinitionJson } from './definition-json.js'
import { parseDefinitionJs } from './definition-js.js'
import type { EffectDefinition } from './types.js'

export { parseDefinitionJson } from './definition-json.js'
export { parseDefinitionJs } from './definition-js.js'
export type { EffectDefinition, EffectUniform, EffectPass } from './types.js'

export function loadEffectDefinition(effectDir: string): EffectDefinition {
  const jsonPath = join(effectDir, 'definition.json')
  if (existsSync(jsonPath)) {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    return parseDefinitionJson(raw, effectDir)
  }

  const jsPath = join(effectDir, 'definition.js')
  if (existsSync(jsPath)) {
    return parseDefinitionJs(jsPath, effectDir)
  }

  throw new Error(`No definition.json or definition.js found in ${effectDir}`)
}
