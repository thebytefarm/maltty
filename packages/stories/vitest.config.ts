import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/__test__/**',
      ],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      provider: 'v8',
      reporter: [
        ['text', { skipFull: true }],
        ['json', {}],
        ['html', {}],
      ],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
