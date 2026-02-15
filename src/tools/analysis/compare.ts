import { z } from 'zod'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getConfig } from '../../config.js'

export const compareShadersSchema = {
  effect_id: z.string().describe('Effect ID (e.g., "synth/noise")'),
}

function extractFunctionNames(source: string, lang: 'glsl' | 'wgsl'): string[] {
  const names: string[] = []
  if (lang === 'glsl') {
    const regex = /(?:void|float|vec[234]|mat[234]|int|bool)\s+(\w+)\s*\(/g
    let match
    while ((match = regex.exec(source)) !== null) {
      names.push(match[1])
    }
  } else {
    const regex = /fn\s+(\w+)\s*\(/g
    let match
    while ((match = regex.exec(source)) !== null) {
      names.push(match[1])
    }
  }
  return names
}

function extractUniforms(source: string, lang: 'glsl' | 'wgsl'): string[] {
  const uniforms: string[] = []
  if (lang === 'glsl') {
    const regex = /uniform\s+\w+\s+(\w+)/g
    let match
    while ((match = regex.exec(source)) !== null) {
      uniforms.push(match[1])
    }
  } else {
    const regex = /@group\(\d+\)\s+@binding\(\d+\)\s+var<uniform>\s+(\w+)/g
    let match
    while ((match = regex.exec(source)) !== null) {
      uniforms.push(match[1])
    }
  }
  return uniforms
}

export async function compareShaders(effectId: string): Promise<any> {
  const config = getConfig()
  const effectDir = join(config.effectsDir, ...effectId.split('/'))
  const glslDir = join(effectDir, 'glsl')
  const wgslDir = join(effectDir, 'wgsl')

  const results: any[] = []

  const glslFiles = existsSync(glslDir) ? readdirSync(glslDir).filter(f => f.endsWith('.glsl')) : []
  const wgslFiles = existsSync(wgslDir) ? readdirSync(wgslDir).filter(f => f.endsWith('.wgsl')) : []

  const wgslMap = new Map(wgslFiles.map(f => [basename(f, '.wgsl'), f]))

  for (const gf of glslFiles) {
    const program = basename(gf, '.glsl')
    const wf = wgslMap.get(program)

    const glslSource = readFileSync(join(glslDir, gf), 'utf-8')
    const glslFunctions = extractFunctionNames(glslSource, 'glsl')
    const glslUniforms = extractUniforms(glslSource, 'glsl')
    const glslLines = glslSource.split('\n').length

    if (wf) {
      const wgslSource = readFileSync(join(wgslDir, wf), 'utf-8')
      const wgslFunctions = extractFunctionNames(wgslSource, 'wgsl')
      const wgslUniforms = extractUniforms(wgslSource, 'wgsl')
      const wgslLines = wgslSource.split('\n').length

      results.push({
        program,
        glsl: { lines: glslLines, functions: glslFunctions, uniforms: glslUniforms },
        wgsl: { lines: wgslLines, functions: wgslFunctions, uniforms: wgslUniforms },
        lineDiff: Math.abs(glslLines - wgslLines),
        functionCountDiff: Math.abs(glslFunctions.length - wgslFunctions.length),
      })
      wgslMap.delete(program)
    } else {
      results.push({
        program,
        glsl: { lines: glslLines, functions: glslFunctions, uniforms: glslUniforms },
        wgsl: null,
        note: 'No WGSL counterpart',
      })
    }
  }

  for (const [program, wf] of wgslMap) {
    const wgslSource = readFileSync(join(wgslDir, wf), 'utf-8')
    results.push({
      program,
      glsl: null,
      wgsl: {
        lines: wgslSource.split('\n').length,
        functions: extractFunctionNames(wgslSource, 'wgsl'),
        uniforms: extractUniforms(wgslSource, 'wgsl'),
      },
      note: 'No GLSL counterpart',
    })
  }

  return {
    status: 'ok',
    programs: results,
    summary: `${results.length} programs compared`
  }
}

export function registerCompareShaders(server: any): void {
  server.tool(
    'compareShaders',
    'Static structural comparison: function names, uniform declarations, line counts. No AI needed.',
    compareShadersSchema,
    async (args: any) => {
      const result = await compareShaders(args.effect_id)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )
}
