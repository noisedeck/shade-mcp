import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { loadEffectDefinition } from '../../formats/index.js'
import { getConfig } from '../../config.js'

export const generateManifestSchema = {}

export function registerGenerateManifest(server: McpServer): void {
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

      // Flat layout: effectsDir itself is an effect
      if (existsSync(join(effectsDir, 'definition.json')) || existsSync(join(effectsDir, 'definition.js'))) {
        try {
          const def = loadEffectDefinition(effectsDir)
          const dirName = basename(effectsDir)
          manifest[dirName] = {
            name: def.name || def.func,
            description: def.description || '',
            tags: def.tags || [],
            passes: def.passes.length,
            format: def.format,
          }
        } catch { /* skip */ }
      }

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
