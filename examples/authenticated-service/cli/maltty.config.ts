import { defineConfig } from 'maltty/config'

export default defineConfig({
  commands: './src/commands',
  compile: true,
  entry: './src/index.ts',
})
