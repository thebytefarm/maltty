import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // ── Standard exclusions ──────────────────────────────────────
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.stories.tsx',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/test/**',
        '**/templates/**',

        // ── React/Ink components ─────────────────────────────────────
        // These depend on Ink's rendering lifecycle, terminal I/O
        // (alt-screen buffers, resize events, stdin/stdout), and React
        // Hooks (useInput, useSyncExternalStore). They cannot be unit
        // Tested without a full terminal emulator. Covered implicitly
        // By integration tests and the examples test suite.
        '**/ui/layout/fullscreen.tsx',
        '**/ui/layout/use-size.tsx',
        '**/ui/layout/scroll-area.tsx',
        '**/ui/layout/tabs.tsx',
        '**/ui/output.tsx',
        '**/ui/use-key-binding.ts',
        '**/ui/theme.ts',
        '**/ui/prompts/**',
        '**/ui/display/**',
        '**/screen/provider.tsx',
        '**/screen/output/use-output-store.ts',

        // ── Stories viewer ───────────────────────────────────────────
        // Full Ink TUI application with panels, focus management, and
        // Live component preview. Requires interactive terminal.
        '**/stories/viewer/**',
        '**/stories/decorators.tsx',

        // ── Dynamic module loading ───────────────────────────────────
        // Patches Node module resolution at runtime via jiti and
        // Dynamic import(). Unsafe to unit test — the module patching
        // Side effects leak across test boundaries.
        '**/stories/importer.ts',

        // ── Bun subprocess entry point ───────────────────────────────
        // Runs inside a `bun` process (not Node.js). Calls Bun.build()
        // Which is a Bun-only API unavailable in Vitest/Node.
        '**/build/bun-runner.ts',

        // ── CLI command handlers (integration-tested) ────────────────
        // These are side-effect-heavy command handlers that spawn child
        // Processes, read process.argv/platform/arch, and depend on
        // Compiled binaries. Tested via integration test suite.
        '**/commands/run.ts',
        '**/commands/stories.ts',
      ],
      include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      provider: 'v8',
      reporter: [
        ['text', { skipFull: true }],
        ['json', {}],
        ['html', {}],
      ],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 87,
        functions: 95,
        lines: 93,
        statements: 93,
      },
    },
    projects: [
      'packages/bundler',
      'packages/cli',
      'packages/config',
      'packages/maltty',
      'packages/utils',
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'exports',
          include: ['tests/exports.test.ts'],
        },
      },
    ],
  },
})
