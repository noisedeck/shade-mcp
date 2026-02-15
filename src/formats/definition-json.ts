import type { EffectDefinition, EffectUniform } from './types.js'

export function parseDefinitionJson(json: Record<string, unknown>, effectDir: string): EffectDefinition {
  const globals: EffectDefinition['globals'] = {}
  const rawGlobals = (json.globals || {}) as Record<string, Record<string, unknown>>

  for (const [key, spec] of Object.entries(rawGlobals)) {
    globals[key] = {
      name: key,
      type: (spec.type as EffectUniform['type']) || 'float',
      uniform: (spec.uniform as string) || key,
      default: spec.default as number | number[] | undefined,
      min: spec.min as number | undefined,
      max: spec.max as number | undefined,
      step: spec.step as number | undefined,
      choices: spec.choices as Record<string, number> | undefined,
      control: spec.control as boolean | undefined,
    }
  }

  const rawPasses = (json.passes || []) as Array<Record<string, unknown>>
  const passes: EffectDefinition['passes'] = rawPasses.map(p => ({
    name: p.name as string | undefined,
    program: (p.program as string) || 'main',
    type: p.type as 'render' | 'compute' | 'gpgpu' | undefined,
    inputs: p.inputs as Record<string, string> | undefined,
    outputs: p.outputs as Record<string, string> | undefined,
  }))

  return {
    func: json.func as string,
    name: json.name as string | undefined,
    namespace: json.namespace as string | undefined,
    description: json.description as string | undefined,
    starter: json.starter as boolean | undefined,
    tags: json.tags as string[] | undefined,
    globals,
    passes,
    format: 'json',
    effectDir,
  }
}
