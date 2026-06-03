import { defineConfig } from '@maltty/core'

export default defineConfig({
  build: {
    out: './dist',
    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
  },
  commands: './src/commands',
  compile: true,
  entry: './src/index.ts',
})
