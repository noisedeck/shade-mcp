import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'harness/index': 'src/harness/index.ts',
    'formats/index': 'src/formats/index.ts',
    'ai/provider': 'src/ai/provider.ts',
    'analysis/index': 'src/analysis/index.ts',
    'knowledge/index': 'src/knowledge/index.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  // Declarations are emitted by `tsc --emitDeclarationOnly`, not by tsup.
  //
  // tsup generates .d.ts via rollup-plugin-dts, which imports the TypeScript
  // compiler API from the `typescript` main entry. TypeScript 7 is the native
  // port: its package exports map resolves "." to ./lib/version.cjs, which
  // exports only { version, versionMajorMinor }. `ts.sys` is undefined there,
  // so rollup-plugin-dts dies with
  //   TypeError: Cannot read properties of undefined
  //     (reading 'useCaseSensitiveFileNames')
  // That is an intentional API removal, not a bug awaiting a tsup patch —
  // the compiler API now lives behind `typescript/unstable/*`.
  //
  // tsup's JS output goes through esbuild and needs no TypeScript API, so it
  // works fine on 7.x. See the `build` script for the declaration step.
  dts: false,
})
