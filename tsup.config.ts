import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'harness/index': 'src/harness/index.ts',
    'formats/index': 'src/formats/index.ts',
    'ai/provider': 'src/ai/provider.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
})
