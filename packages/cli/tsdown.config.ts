import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  deps: {
    // Bundle @maltty/* packages so the published CLI is self-contained and
    // Does not depend on workspace packages being published with correct exports.
    alwaysBundle: [/^@maltty\//],
    // Keep packages with native bindings external — they cannot be inlined.
    neverBundle: ['tsdown', /^@rolldown\//, /^rolldown/],
  },
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  // Glob pattern auto-discovers command files so new commands are built without config changes.
  // Other packages use explicit object notation because they expose a fixed public API.
  entry: ['src/index.ts', 'src/commands/**/*.ts', '!src/**/*.test.ts'],
  format: 'esm',
})
