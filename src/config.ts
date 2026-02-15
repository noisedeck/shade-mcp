import { resolve } from 'node:path'

export type Backend = 'webgl2' | 'webgpu'

export interface Config {
  effectsDir: string
  viewerPort: number
  defaultBackend: Backend
  projectRoot: string
}

export function getConfig(): Config {
  const projectRoot = process.env.SHADE_PROJECT_ROOT || process.cwd()
  return {
    effectsDir: process.env.SHADE_EFFECTS_DIR || resolve(projectRoot, 'effects'),
    viewerPort: parseInt(process.env.SHADE_VIEWER_PORT || '4173', 10),
    defaultBackend: (process.env.SHADE_BACKEND as Backend) || 'webgl2',
    projectRoot
  }
}
