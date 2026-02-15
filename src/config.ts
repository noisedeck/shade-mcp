import { resolve } from 'node:path'

export type Backend = 'webgl2' | 'webgpu'

const VALID_BACKENDS: readonly Backend[] = ['webgl2', 'webgpu']

export interface Config {
  effectsDir: string
  viewerPort: number
  defaultBackend: Backend
  projectRoot: string
  globalsPrefix: string | undefined
  viewerPath: string | undefined
}

function parseBackend(value: string | undefined): Backend {
  if (value && VALID_BACKENDS.includes(value as Backend)) {
    return value as Backend
  }
  return 'webgl2'
}

export function getConfig(): Config {
  const projectRoot = process.env.SHADE_PROJECT_ROOT || process.cwd()
  return {
    effectsDir: process.env.SHADE_EFFECTS_DIR || resolve(projectRoot, 'effects'),
    viewerPort: parseInt(process.env.SHADE_VIEWER_PORT || '4173', 10),
    defaultBackend: parseBackend(process.env.SHADE_BACKEND),
    projectRoot,
    globalsPrefix: process.env.SHADE_GLOBALS_PREFIX || undefined,
    viewerPath: process.env.SHADE_VIEWER_PATH || undefined,
  }
}
