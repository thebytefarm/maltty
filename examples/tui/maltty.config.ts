import { defineConfig } from '@maltty/core'

export default defineConfig({
  build: { out: './dist' },
  commands: './src/commands',
  compile: true,
  entry: './src/index.ts',
})
