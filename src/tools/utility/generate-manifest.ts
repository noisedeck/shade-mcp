import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getConfig } from '../../config.js'

export const generateManifestSchema = {}

// Regex patterns for extracting metadata from definition.js
const DESCRIPTION_RE = /description[:\s=]+"((?:[^"\\]|\\.)*)"|description[:\s=]+'((?:[^'\\]|\\.)*)'/
const EXTERNAL_TEXTURE_RE = /externalTexture[:\s=]+"((?:[^"\\]|\\.)*)"|externalTexture[:\s=]+'((?:[^'\\]|\\.)*)'/
const EXTERNAL_MESH_RE = /externalMesh[:\s=]+"((?:[^"\\]|\\.)*)"|externalMesh[:\s=]+'((?:[^'\\]|\\.)*)'/
const TAGS_RE = /\btags\s*[:=]\s*\[([^\]]*)\]/
const TEX_SURFACE_RE = /\btex\s*[:=]\s*\{[^}]*type\s*[:=]\s*["']surface["']/s

// Known pipeline inputs that indicate a non-starter effect
const PIPELINE_INPUTS = new Set([
  'inputTex', 'inputTex3d',
  'inputXyz', 'inputVel', 'inputRgba',
  'o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7',
])
const AGENT_STATE_SURFACES = new Set([
  'global_xyz0', 'global_vel0', 'global_rgba0',
])

function readDefinition(effectDir: string): string | null {
  const defFile = join(effectDir, 'definition.js')
  if (!existsSync(defFile)) return null
  try { return readFileSync(defFile, 'utf-8') } catch { return null }
}

function extractMatch(content: string, re: RegExp): string | null {
  const m = content.match(re)
  if (!m) return null
  const raw = m[1] !== undefined ? m[1] : m[2]
  if (!raw) return null
  return raw.replace(/\\"/g, '"').replace(/\\'/g, "'")
}

function extractTags(content: string): string[] | null {
  const m = content.match(TAGS_RE)
  if (!m) return null
  const tags: string[] = []
  for (const tm of m[1].matchAll(/["']([^"']+)["']/g)) {
    tags.push(tm[1])
  }
  return tags.length ? tags : null
}

function isStarterEffect(content: string): boolean {
  const passesMatch = content.match(/passes\s*[=:]\s*\[/)
  if (!passesMatch) return true

  const texturesMatch = content.match(/textures\s*[:=]\s*\{[\s\S]*?\}/)
  let definesAgentSurfaces = false
  if (texturesMatch) {
    for (const surface of AGENT_STATE_SURFACES) {
      if (texturesMatch[0].includes(surface)) { definesAgentSurfaces = true; break }
    }
  }

  const inputsSections = content.matchAll(/inputs:\s*\{[\s\S]*?\}/g)
  for (const inputsMatch of inputsSections) {
    const inputs = inputsMatch[0]
    for (const pipelineInput of PIPELINE_INPUTS) {
      const pattern = new RegExp(`:\\s*["']${pipelineInput}["']`)
      if (pattern.test(inputs)) return false
    }
    if (!definesAgentSurfaces) {
      for (const surface of AGENT_STATE_SURFACES) {
        const pattern = new RegExp(`:\\s*["']${surface}["']`)
        if (pattern.test(inputs)) return false
      }
    }
  }
  return true
}

function scanShaders(effectDir: string): Record<string, any> {
  const result: Record<string, any> = { glsl: {}, wgsl: {} }

  const glslDir = join(effectDir, 'glsl')
  if (existsSync(glslDir)) {
    for (const name of readdirSync(glslDir)) {
      if (!statSync(join(glslDir, name)).isFile()) continue
      if (name.endsWith('.glsl')) {
        result.glsl[name.slice(0, -5)] = 'combined'
      } else if (name.endsWith('.vert')) {
        const stem = name.slice(0, -5)
        if (!(stem in result.glsl)) result.glsl[stem] = {}
        if (typeof result.glsl[stem] === 'object') result.glsl[stem].v = 1
      } else if (name.endsWith('.frag')) {
        const stem = name.slice(0, -5)
        if (!(stem in result.glsl)) result.glsl[stem] = {}
        if (typeof result.glsl[stem] === 'object') result.glsl[stem].f = 1
      }
    }
  }

  const wgslDir = join(effectDir, 'wgsl')
  if (existsSync(wgslDir)) {
    for (const name of readdirSync(wgslDir)) {
      if (!statSync(join(wgslDir, name)).isFile()) continue
      if (name.endsWith('.wgsl')) {
        result.wgsl[name.slice(0, -5)] = 1
      }
    }
  }

  if (!Object.keys(result.glsl).length) delete result.glsl
  if (!Object.keys(result.wgsl).length) delete result.wgsl
  return result
}

function sortKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortKeys)
  if (obj && typeof obj === 'object') {
    const sorted: Record<string, any> = {}
    for (const key of Object.keys(obj).sort()) sorted[key] = sortKeys(obj[key])
    return sorted
  }
  return obj
}

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
      const namespaces = readdirSync(effectsDir).sort()

      for (const ns of namespaces) {
        const nsDir = join(effectsDir, ns)
        if (!statSync(nsDir).isDirectory()) continue

        const entries = readdirSync(nsDir).sort()
        for (const entry of entries) {
          const effectDir = join(nsDir, entry)
          if (!statSync(effectDir).isDirectory()) continue

          const content = readDefinition(effectDir)
          if (!content) continue

          const effectId = `${ns}/${entry}`
          const effectManifest = scanShaders(effectDir)

          const description = extractMatch(content, DESCRIPTION_RE)
          if (description) effectManifest.description = description

          const externalTexture = extractMatch(content, EXTERNAL_TEXTURE_RE)
          if (externalTexture) effectManifest.externalTexture = externalTexture

          const externalMesh = extractMatch(content, EXTERNAL_MESH_RE)
          if (externalMesh) effectManifest.externalMesh = externalMesh

          if (TEX_SURFACE_RE.test(content)) effectManifest.hasTex = true

          effectManifest.starter = isStarterEffect(content)

          const tags = extractTags(content)
          if (tags) effectManifest.tags = tags

          manifest[effectId] = effectManifest
        }
      }

      const manifestPath = join(effectsDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(sortKeys(manifest)))

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
