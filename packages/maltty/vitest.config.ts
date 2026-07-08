import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${resolve(__dirname, 'src')}/$1` },
      { find: /^@test\/(.*)$/, replacement: `${resolve(__dirname, 'src/test')}/$1` },
      { find: /^maltty$/, replacement: resolve(__dirname, 'src/index.ts') },
      { find: /^maltty\/test$/, replacement: resolve(__dirname, 'src/test/index.ts') },
      { find: /^maltty\/stories$/, replacement: resolve(__dirname, 'src/stories/index.ts') },
      {
        find: /^maltty\/config$/,
        replacement: resolve(__dirname, 'src/middleware/config/index.ts'),
      },
    ],
  },
  test: {
    coverage: {
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/test/**',
        '**/templates/**',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: [
        ['text', { skipFull: true }],
        ['json', {}],
        ['html', {}],
      ],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
    include: ['src/**/*.test.ts'],
  },
})
