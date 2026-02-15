import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

export function resolveEffectIds(
  args: { effect_id?: string; effects?: string },
  effectsDir: string,
): string[] {
  // CSV takes precedence
  if (args.effects) {
    return args.effects.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Single effect_id
  if (args.effect_id) {
    return [args.effect_id]
  }

  // Auto-detect: scan effectsDir for effects (directories with definition.json or definition.js)
  if (!existsSync(effectsDir)) {
    throw new Error(`Effects directory not found: ${effectsDir}. Specify effect_id or set SHADE_EFFECTS_DIR.`)
  }

  const found: string[] = []
  try {
    const namespaces = readdirSync(effectsDir).filter(n => !n.startsWith('.'))
    for (const ns of namespaces) {
      const nsDir = join(effectsDir, ns)
      if (!statSync(nsDir).isDirectory()) continue
      const effects = readdirSync(nsDir).filter(n => !n.startsWith('.'))
      for (const effect of effects) {
        const effectDir = join(nsDir, effect)
        if (!statSync(effectDir).isDirectory()) continue
        if (existsSync(join(effectDir, 'definition.json')) || existsSync(join(effectDir, 'definition.js'))) {
          found.push(`${ns}/${effect}`)
        }
      }
    }
  } catch {
    throw new Error(`Failed to scan effects directory: ${effectsDir}`)
  }

  if (found.length === 0) {
    throw new Error(`No effects found in ${effectsDir}. Specify effect_id.`)
  }

  if (found.length === 1) {
    console.warn(`[shade-mcp] Auto-detected single effect: ${found[0]}`)
    return found
  }

  throw new Error(
    `Multiple effects found (${found.length}). Please specify effect_id or effects parameter. Available: ${found.slice(0, 10).join(', ')}${found.length > 10 ? '...' : ''}`
  )
}
