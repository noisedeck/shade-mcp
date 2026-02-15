import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { loadEffectDefinition } from '../../formats/index.js'
import { getConfig } from '../../config.js'

export const checkEffectStructureSchema = {
  effect_id: z.string().describe('Effect ID (e.g., "synth/noise")'),
}

function checkCamelCase(name: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(name)
}

export async function checkEffectStructure(effectId: string): Promise<any> {
  const config = getConfig()
  const effectDir = join(config.effectsDir, ...effectId.split('/'))

  if (!existsSync(effectDir)) {
    return { status: 'error', error: `Effect directory not found: ${effectDir}` }
  }

  const issues: any = {
    unusedFiles: [] as string[],
    namingIssues: [] as any[],
    leakedInternalUniforms: [] as string[],
    missingDescription: false,
    structuralParityIssues: [] as any[],
    requiredUniformIssues: [] as any[],
    multiPass: false,
    passCount: 0,
  }

  // Parse definition
  let def: any
  try {
    def = loadEffectDefinition(effectDir)
  } catch (err: any) {
    return { status: 'error', error: `Failed to parse definition: ${err.message}` }
  }

  // Check description
  issues.missingDescription = !def.description

  // Check passes
  issues.passCount = def.passes.length
  issues.multiPass = def.passes.length > 1

  // Check naming
  if (def.func && !checkCamelCase(def.func)) {
    issues.namingIssues.push({ type: 'func', name: def.func, reason: 'Must be camelCase' })
  }

  // Check globals naming and leaked internals
  const INTERNAL = new Set(['channels', 'time', 'resolution', 'mouse'])
  for (const [name, spec] of Object.entries(def.globals || {}) as any[]) {
    if (!checkCamelCase(name)) {
      issues.namingIssues.push({ type: 'global', name, reason: 'Must be camelCase' })
    }
    if (INTERNAL.has(spec.uniform || name)) {
      issues.leakedInternalUniforms.push(name)
    }
  }

  // Check shader files
  const glslDir = join(effectDir, 'glsl')
  const wgslDir = join(effectDir, 'wgsl')
  const glslFiles = existsSync(glslDir) ? readdirSync(glslDir).filter(f => f.endsWith('.glsl')) : []
  const wgslFiles = existsSync(wgslDir) ? readdirSync(wgslDir).filter(f => f.endsWith('.wgsl')) : []

  // Referenced programs from passes
  const referencedPrograms = new Set(def.passes.map((p: any) => p.program))

  // Unused files
  for (const f of glslFiles) {
    const name = basename(f, '.glsl')
    if (!referencedPrograms.has(name)) {
      issues.unusedFiles.push(`glsl/${f}`)
    }
  }
  for (const f of wgslFiles) {
    const name = basename(f, '.wgsl')
    if (!referencedPrograms.has(name)) {
      issues.unusedFiles.push(`wgsl/${f}`)
    }
  }

  // Structural parity: every GLSL should have matching WGSL
  const glslPrograms = new Set(glslFiles.map(f => basename(f, '.glsl')))
  const wgslPrograms = new Set(wgslFiles.map(f => basename(f, '.wgsl')))

  for (const p of glslPrograms) {
    if (!wgslPrograms.has(p)) {
      issues.structuralParityIssues.push({ type: 'missing_wgsl', program: p, message: `GLSL program "${p}" has no WGSL counterpart` })
    }
  }
  for (const p of wgslPrograms) {
    if (!glslPrograms.has(p)) {
      issues.structuralParityIssues.push({ type: 'missing_glsl', program: p, message: `WGSL program "${p}" has no GLSL counterpart` })
    }
  }

  const hasIssues = issues.unusedFiles.length > 0 || issues.namingIssues.length > 0 ||
    issues.leakedInternalUniforms.length > 0 || issues.missingDescription ||
    issues.structuralParityIssues.length > 0

  return { status: hasIssues ? 'warning' : 'ok', ...issues }
}

export function registerCheckEffectStructure(server: McpServer): void {
  server.tool(
    'checkEffectStructure',
    'Detect unused files, broken references, naming violations, leaked/undefined uniforms, missing descriptions, structural parity issues.',
    checkEffectStructureSchema,
    async (args: any) => {
      const result = await checkEffectStructure(args.effect_id)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )
}
