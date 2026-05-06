import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  tsconfig: 'tsconfig.lib.json',
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  fixedExtension: false,
})
