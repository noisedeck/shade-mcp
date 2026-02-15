import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface GlslSearchResult {
  effectId: string
  file: string
  lineNumber: number
  matchLine: string
  context: string
}

export class GlslIndex {
  private files = new Map<string, { effectId: string; content: string; file: string }>()
  private initialized = false

  async initialize(effectsDir: string): Promise<void> {
    if (this.initialized) return
    if (!existsSync(effectsDir)) return

    const namespaces = readdirSync(effectsDir)
    for (const ns of namespaces) {
      const nsDir = join(effectsDir, ns)
      if (!statSync(nsDir).isDirectory()) continue

      const effects = readdirSync(nsDir)
      for (const effect of effects) {
        const effectDir = join(nsDir, effect)
        if (!statSync(effectDir).isDirectory()) continue

        const glslDir = join(effectDir, 'glsl')
        if (!existsSync(glslDir)) continue

        const glslFiles = readdirSync(glslDir).filter(f => f.endsWith('.glsl'))
        for (const gf of glslFiles) {
          const filePath = join(glslDir, gf)
          const content = readFileSync(filePath, 'utf-8')
          const effectId = `${ns}/${effect}`
          this.files.set(`${effectId}/${gf}`, { effectId, content, file: gf })
        }
      }
    }

    this.initialized = true
  }

  search(query: string, contextLines = 5, limit = 10): GlslSearchResult[] {
    let regex: RegExp
    try {
      regex = new RegExp(query, 'gi')
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    }

    const results: GlslSearchResult[] = []

    for (const [, entry] of this.files) {
      const lines = entry.content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (!regex.test(lines[i])) continue
        regex.lastIndex = 0

        const start = Math.max(0, i - contextLines)
        const end = Math.min(lines.length, i + contextLines + 1)
        const contextArr = lines.slice(start, end).map((line, idx) => {
          const lineNum = start + idx + 1
          const marker = lineNum === i + 1 ? '>>>' : '   '
          return `${marker} ${lineNum}: ${line}`
        })

        results.push({
          effectId: entry.effectId,
          file: entry.file,
          lineNumber: i + 1,
          matchLine: lines[i].trim(),
          context: contextArr.join('\n'),
        })

        // Skip nearby matches
        i += contextLines

        if (results.length >= limit) return results
      }
    }

    return results
  }

  get size(): number {
    return this.files.size
  }
}
