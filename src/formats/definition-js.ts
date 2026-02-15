import { readFileSync } from 'node:fs'
import type { EffectDefinition, EffectUniform } from './types.js'

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

  // Extract globals with type info
  const globals: EffectDefinition['globals'] = {}
  const globalsMatch = source.match(/globals:\s*\{([\s\S]*?)\n\s*\}/)
  if (globalsMatch) {
    const uniformRegex = /(\w+):\s*(\{[^}]*\})/g
    let uMatch
    while ((uMatch = uniformRegex.exec(globalsMatch[1])) !== null) {
      const name = uMatch[1]
      const block = uMatch[2]
      const uniform = extractString(block, /uniform:\s*['"](\w+)['"]/)
      if (!uniform) continue

      const type = extractString(block, /type:\s*['"](\w+)['"]/) || 'float'
      const min = extractNumber(block, /min:\s*([-\d.]+)/)
      const max = extractNumber(block, /max:\s*([-\d.]+)/)
      const step = extractNumber(block, /step:\s*([-\d.]+)/)
      const defaultVal = extractNumber(block, /default:\s*([-\d.]+)/)

      globals[name] = {
        name,
        type: type as EffectUniform['type'],
        uniform,
        ...(defaultVal !== undefined && { default: defaultVal }),
        ...(min !== undefined && { min }),
        ...(max !== undefined && { max }),
        ...(step !== undefined && { step }),
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

function extractNumber(source: string, regex: RegExp): number | undefined {
  const match = source.match(regex)
  return match ? parseFloat(match[1]) : undefined
}
