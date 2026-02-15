// Harness core
export { BrowserSession } from './browser-session.js'
export { acquireServer, releaseServer, getServerUrl, getRefCount } from './server-manager.js'
export { computeImageMetrics } from './pixel-reader.js'

// Types
export type {
  BrowserSessionOptions, ViewerGlobals,
  ImageMetrics, CompileResult, RenderResult, BenchmarkResult, ParityResult
} from './types.js'
export { DEFAULT_GLOBALS } from './types.js'

// Browser operations
export { compileEffect } from '../tools/browser/compile.js'
export { renderEffectFrame } from '../tools/browser/render.js'
export { benchmarkEffectFPS } from '../tools/browser/benchmark.js'
export { testNoPassthrough } from '../tools/browser/passthrough.js'
export { testPixelParity } from '../tools/browser/parity.js'
export { testUniformResponsiveness } from '../tools/browser/uniforms.js'
export { runDslProgram } from '../tools/browser/dsl.js'

// Analysis operations (on-disk, no AI dependency)
export { checkEffectStructure } from '../tools/analysis/structure.js'
export { compareShaders } from '../tools/analysis/compare.js'

// Utilities
export { resolveEffectIds, resolveEffectDir, matchEffects } from '../tools/resolve-effects.js'
