import { readFileSync } from 'node:fs'
import type { EffectDefinition } from './types.js'

export function parseDefinitionJs(filePath: string, effectDir: string): EffectDefinition {
  const source = readFileSync(filePath, 'utf-8')

  const func = extractString(source, /func:\s*['"](\w+)['"]/) || 'unknown'
  const name = extractString(source, /name:\s*['"]([^'"]+)['"]/)
  const namespace = extractString(source, /namespace:\s*['"](\w+)['"]/)
  const description = extractString(source, /description:\s*['"]([^'"]+)['"]/)
  const starter = /starter:\s*true/.test(source) ? true : undefined

  // Extract tags
  const tagsMatch = source.match(/tags:\s*\[([^\]]+)\]/)
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean)
    : undefined

  // Extract passes - look for program references
  const passes: EffectDefinition['passes'] = []
  const passRegex = /program:\s*['"](\w+)['"]/g
  let match
  while ((match = passRegex.exec(source)) !== null) {
    passes.push({ program: match[1] })
  }
  if (passes.length === 0) {
    passes.push({ program: 'main' })
  }

  // Extract globals (basic extraction)
  const globals: EffectDefinition['globals'] = {}
  const globalsMatch = source.match(/globals:\s*\{([\s\S]*?)\n\s*\}/)
  if (globalsMatch) {
    const uniformRegex = /(\w+):\s*\{[^}]*uniform:\s*['"](\w+)['"][^}]*\}/g
    let uMatch
    while ((uMatch = uniformRegex.exec(globalsMatch[1])) !== null) {
      globals[uMatch[1]] = {
        name: uMatch[1],
        type: 'float',
        uniform: uMatch[2],
      }
    }
  }

  return {
    func,
    name,
    namespace,
    description,
    starter,
    tags,
    globals,
    passes,
    format: 'js',
    effectDir,
  }
}

function extractString(source: string, regex: RegExp): string | undefined {
  const match = source.match(regex)
  return match ? match[1] : undefined
}
