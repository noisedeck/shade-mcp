import { readFileSync } from 'node:fs'
import type { EffectDefinition, EffectUniform } from './types.js'

export function parseDefinitionJs(filePath: string, effectDir: string): EffectDefinition {
  const source = readFileSync(filePath, 'utf-8')

  const func = extractString(source, /func\s*[:=]\s*['"](\w+)['"]/) || 'unknown'
  const name = extractQuotedValue(source, 'name')
  const namespace = extractString(source, /namespace\s*[:=]\s*['"](\w+)['"]/)
  const description = extractQuotedValue(source, 'description')
  const starter = /starter\s*[:=]\s*true/.test(source) ? true : /starter\s*[:=]\s*false/.test(source) ? false : undefined

  // Extract tags
  const tagsMatch = source.match(/tags\s*[:=]\s*\[([^\]]+)\]/)
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

  // Extract globals with type info. Use balanced-brace slicing so a spec that
  // contains a nested object (e.g. a `choices` map) is captured whole instead
  // of being truncated at the first inner `}`.
  const globals: EffectDefinition['globals'] = {}
  const globalsKey = source.match(/globals\s*[:=]\s*\{/)
  const globalsText = globalsKey ? balancedBraceSlice(source, globalsKey.index! + globalsKey[0].length - 1) : null
  if (globalsText) {
    const body = globalsText.slice(1, -1)
    const keyRegex = /(\w+)\s*:\s*\{/g
    let kMatch
    while ((kMatch = keyRegex.exec(body)) !== null) {
      const name = kMatch[1]
      const blockStart = kMatch.index + kMatch[0].length - 1
      const block = balancedBraceSlice(body, blockStart)
      if (!block) continue
      // Skip past this spec's whole block so its nested keys aren't re-matched.
      keyRegex.lastIndex = blockStart + block.length
      // Extract fields from the spec's OWN keys only — strip nested objects so a
      // colliding key inside e.g. a `choices` map isn't read as a spec field.
      const ownFields = stripNestedObjects(block)
      const uniform = extractString(ownFields, /uniform:\s*['"](\w+)['"]/)
      if (!uniform) continue

      const type = extractString(ownFields, /type:\s*['"](\w+)['"]/) || 'float'
      const min = extractNumber(ownFields, /min:\s*([-\d.]+)/)
      const max = extractNumber(ownFields, /max:\s*([-\d.]+)/)
      const step = extractNumber(ownFields, /step:\s*([-\d.]+)/)
      const defaultVal = extractNumber(ownFields, /default:\s*([-\d.]+)/)

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

// Extract a quoted value (`key: '...'` or `key: "..."`). The opening quote is
// captured and matched as the closing quote via backreference, so an apostrophe
// inside a double-quoted string (or a quote inside a single-quoted string) does
// not truncate the value. `\b<key>` avoids matching inside a longer key (e.g.
// `filename` vs `name`). The body uses non-overlapping alternatives — `\\.` for
// an escaped char, `[^\\\r\n]` for any other same-line char — with a lazy
// quantifier, so matching is linear (no catastrophic backtracking) and confined
// to a single line. Escaped quotes/backslashes are unescaped in the result.
function extractQuotedValue(source: string, key: string): string | undefined {
  const re = new RegExp(`\\b${key}\\s*[:=]\\s*(['"])((?:\\\\.|[^\\\\\\r\\n])*?)\\1`)
  const match = source.match(re)
  return match ? match[2].replace(/\\(['"\\])/g, '$1') : undefined
}

// Return the substring from the brace at `openIndex` through its matching close
// brace (inclusive), or null if unbalanced. Does not account for braces inside
// string literals, which do not occur in these spec blocks in practice.
function balancedBraceSlice(s: string, openIndex: number): string | null {
  let depth = 0
  for (let i = openIndex; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(openIndex, i + 1)
    }
  }
  return null
}

// Drop nested objects from a brace-delimited block, keeping only its own
// (depth-1) keys/values. Lets field extractors read a spec's own fields without
// picking up colliding keys from a nested object (e.g. a `choices` map).
function stripNestedObjects(block: string): string {
  let depth = 0
  let out = ''
  for (let i = 0; i < block.length; i++) {
    const ch = block[i]
    if (ch === '{') {
      depth++
      if (depth <= 1) out += ch
    } else if (ch === '}') {
      if (depth <= 1) out += ch
      depth--
    } else if (depth <= 1) {
      out += ch
    }
  }
  return out
}

function extractNumber(source: string, regex: RegExp): number | undefined {
  const match = source.match(regex)
  return match ? parseFloat(match[1]) : undefined
}
