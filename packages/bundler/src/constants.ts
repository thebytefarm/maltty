import { builtinModules } from 'node:module'

/**
 * Shebang line prepended to CLI entry files.
 */
export const SHEBANG = '#!/usr/bin/env node\n'

/**
 * Default entry point for the CLI source.
 */
export const DEFAULT_ENTRY = './src/index.ts'

/**
 * Default directory for CLI commands.
 */
export const DEFAULT_COMMANDS = './commands'

/**
 * Default build output directory.
 */
export const DEFAULT_OUT_DIR = './dist'

/**
 * Default Node.js target version for builds.
 */
export const DEFAULT_TARGET = 'node18'

/**
 * Default minification setting.
 */
export const DEFAULT_MINIFY = true

/**
 * Default source map generation setting.
 */
export const DEFAULT_SOURCEMAP = true

/**
 * Default clean setting — remove build artifacts before building.
 */
export const DEFAULT_CLEAN = true

/**
 * File extensions produced by maltty builds that are safe to remove during clean.
 */
export const BUILD_ARTIFACT_EXTENSIONS: readonly string[] = ['.js', '.mjs', '.js.map', '.mjs.map']

/**
 * Packages that must always be bundled into the output.
 *
 * The `maltty` framework and its internal `@maltty/*` packages must be inlined
 * so the autoload plugin can intercept and replace the runtime autoloader
 * with a static version for compiled binaries.
 */
export const ALWAYS_BUNDLE: RegExp[] = [/^@?maltty/]

/**
 * Packages that are optional or conditional dependencies of bundled libraries
 * (c12, ink) that must be stubbed during compile-mode builds. These are behind
 * dynamic `import()` calls or runtime guards that never execute in production,
 * but when all deps are inlined, rolldown traces into them statically.
 */
export const STUB_PACKAGES: readonly string[] = [
  'chokidar',
  'magicast',
  'giget',
  'react-devtools-core',
]

/**
 * Node.js builtin modules in both bare and `node:` prefixed forms.
 */
export const NODE_BUILTINS: readonly string[] = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]
