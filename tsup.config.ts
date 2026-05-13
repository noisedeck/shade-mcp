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
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  // tsup 8.5.1 hardcodes `baseUrl: "."` into the dts compiler options
  // (see node_modules/tsup/dist/rollup.js — the assignment is unconditional).
  // TypeScript 6 emits TS5101 for `baseUrl` and tells you to set
  // `ignoreDeprecations: "6.0"` until you migrate. We scope it to the dts
  // step only so the main tsconfig.json stays free of deprecated options;
  // the source tree itself has no `baseUrl` and is TS6-clean.
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
})
