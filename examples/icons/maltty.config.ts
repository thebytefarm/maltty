import { defineConfig } from 'maltty/config'

export default defineConfig({
  build: { out: './dist' },
  commands: './commands',
  compile: true,
  entry: './index.ts',
})
