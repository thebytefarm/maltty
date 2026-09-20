import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
})
