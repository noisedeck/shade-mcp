import { z } from 'zod'
import { readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { loadEffectDefinition } from '../../formats/index.js'
import { getConfig } from '../../config.js'

export const generateManifestSchema = {}

export function registerGenerateManifest(server: any): void {
  server.tool(
    'generateManifest',
    'Rebuild effect manifest by scanning effects directory.',
    generateManifestSchema,
    async () => {
      const config = getConfig()
      const effectsDir = config.effectsDir

      if (!existsSync(effectsDir)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Effects directory not found: ${effectsDir}` }) }] }
      }

      const manifest: Record<string, any> = {}
      const namespaces = readdirSync(effectsDir)

      for (const ns of namespaces) {
        const nsDir = join(effectsDir, ns)
        if (!statSync(nsDir).isDirectory()) continue

        const effects = readdirSync(nsDir)
        for (const effect of effects) {
          const effectDir = join(nsDir, effect)
          if (!statSync(effectDir).isDirectory()) continue

          try {
            const def = loadEffectDefinition(effectDir)
            const id = `${ns}/${effect}`
            manifest[id] = {
              name: def.name || def.func,
              description: def.description || '',
              tags: def.tags || [],
              passes: def.passes.length,
              format: def.format,
            }
          } catch {
            // Skip unparseable effects
          }
        }
      }

      // Write manifest
      const manifestPath = join(effectsDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify({ effects: manifest }, null, 2))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'ok',
            path: manifestPath,
            effectCount: Object.keys(manifest).length,
          }, null, 2)
        }]
      }
    }
  )
}
