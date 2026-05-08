import { createRequire } from 'node:module'

import { match } from 'ts-pattern'
import type { Rolldown } from 'tsdown'
import type { InlineConfig } from 'tsdown'

import { createAutoloadPlugin } from '../autoloader/autoload-plugin.js'
import { ALWAYS_BUNDLE, NODE_BUILTINS, SHEBANG, STUB_PACKAGES } from '../constants.js'
import type { ResolvedBundlerConfig } from '../types.js'

const TAG_MODULE_PATH = createRequire(import.meta.url).resolve('@kidd-cli/utils/tag')

/**
 * Convert a resolved bundler config to a tsdown InlineConfig for production builds.
 *
 * @param params - The resolved config and optional version for compile-time injection.
 * @returns A tsdown InlineConfig ready for `build()`.
 */
export function toTsdownBuildConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly compile?: boolean
}): InlineConfig {
  return {
    banner: SHEBANG,
    clean: false,
    config: false,
    cwd: params.config.cwd,
    define: buildDefine({
      define: params.config.build.define,
      version: params.config.version,
    }),
    deps: buildDeps(params.config.build.external, params.compile ?? false),
    dts: false,
    entry: { index: params.config.entry },
    format: 'esm',
    inputOptions: {
      resolve: {
        mainFields: ['module', 'main'],
      },
    },
    logLevel: 'silent',
    minify: params.config.build.minify,
    outDir: params.config.buildOutDir,
    outputOptions: {
      codeSplitting: false,
    },
    platform: 'node',
    plugins: [
      createAutoloadPlugin({
        commandsDir: params.config.commands,
        tagModulePath: TAG_MODULE_PATH,
      }),
      ...buildPlugins(params.compile ?? false),
    ],
    sourcemap: params.config.build.sourcemap,
    target: params.config.build.target,
    treeshake: true,
  }
}

/**
 * Convert a resolved bundler config to a tsdown InlineConfig for watch mode.
 *
 * @param params - The resolved config, optional version, and optional success callback.
 * @returns A tsdown InlineConfig with `watch: true`.
 */
export function toTsdownWatchConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly onSuccess?: () => void | Promise<void>
}): InlineConfig {
  const buildConfig = toTsdownBuildConfig({ config: params.config })

  return {
    ...buildConfig,
    logLevel: 'error',
    onSuccess: params.onSuccess,
    watch: true,
  }
}


/**
 * Build the `deps` configuration for tsdown.
 *
 * When compiling to a standalone binary, all dependencies must be inlined so
 * `bun build --compile` never encounters unresolvable bare imports. Only
 * Node.js builtins and explicit user externals are kept external.
 *
 * In normal (non-compile) mode, only `@kidd-cli/*` packages are force-bundled
 * and everything else in `node_modules` is left external by tsdown's default.
 *
 * @private
 * @param userExternals - Additional packages the user explicitly marked external.
 * @param compile - Whether the build targets a compiled binary.
 * @returns A tsdown `deps` configuration object.
 */
function buildDeps(
  userExternals: readonly string[],
  compile: boolean
): { alwaysBundle: RegExp[]; neverBundle: (string | RegExp)[] } {
  return {
    alwaysBundle: resolveAlwaysBundle(compile),
    neverBundle: [...NODE_BUILTINS, ...userExternals],
  }
}

/**
 * Resolve the `alwaysBundle` rule list based on whether we're compiling.
 *
 * @private
 * @param compile - Whether the build targets a compiled binary.
 * @returns The matchers tsdown should always bundle.
 */
function resolveAlwaysBundle(compile: boolean): RegExp[] {
  if (compile) {
    return [/./]
  }
  return [...ALWAYS_BUNDLE]
}

/**
 * Build the `define` map for tsdown/rolldown.
 *
 * Merges three sources (lowest to highest precedence):
 * 1. `KIDD_PUBLIC_*` env vars — prefixed with `process.env.` for rolldown replacement
 * 2. `__KIDD_VERSION__` — injected when a version string is available
 * 3. Explicit `define` from `kidd.config.ts` — user overrides win
 *
 * @private
 * @param params - The version and user-defined constants.
 * @returns A define map for tsdown/rolldown.
 */
function buildDefine(params: {
  readonly version: string | undefined
  readonly define: Readonly<Record<string, string>>
}): Record<string, string> {
  const envVars = resolveBuildVars()
  const envDefines = Object.fromEntries(
    Object.entries(envVars).map(([key, value]) => [`process.env.${key}`, value])
  )

  const versionDefine = match(params.version)
    .with(undefined, () => ({}))
    .otherwise((v) => ({ __KIDD_VERSION__: JSON.stringify(v) }))

  return {
    ...envDefines,
    ...versionDefine,
    ...params.define,
  }
}

/**
 * Resolve `KIDD_PUBLIC_*` environment variables into a define map.
 *
 * Scans `process.env` for keys prefixed with `KIDD_PUBLIC_` and returns
 * clean key-value pairs with JSON-stringified values.
 *
 * @param env - The environment variables to scan (defaults to `process.env`).
 * @returns A define map with clean keys (no `process.env.` prefix).
 */
export function resolveBuildVars(
  env: Readonly<Record<string, string | undefined>> = process.env
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('KIDD_PUBLIC_'))
      .map(([key, value]) => [key, JSON.stringify(value ?? '')])
  )
}

/**
 * Build additional plugins needed when compiling to a standalone binary.
 *
 * When `compile` is true, includes a stub plugin that replaces optional/conditional
 * dependencies with empty modules so rolldown (and subsequently bun compile) never
 * attempts to resolve packages that don't exist at runtime.
 *
 * @private
 * @param compile - Whether the build targets a compiled binary.
 * @returns An array of rolldown plugins (empty when not compiling).
 */
function buildPlugins(compile: boolean): Rolldown.Plugin[] {
  if (compile) {
    return [createStubPlugin(STUB_PACKAGES)]
  }
  return []
}

/**
 * Create a rolldown plugin that replaces specified packages with empty modules.
 *
 * Libraries like c12 and ink have optional/conditional dependencies behind
 * dynamic `import()` calls or runtime guards (e.g. `isDev()`). When all deps
 * are inlined for compile mode, rolldown traces into these statically. Stubbing
 * at the resolve level ensures the real package is never loaded.
 *
 * @private
 * @param packages - Package names to replace with empty modules.
 * @returns A rolldown plugin.
 */
function createStubPlugin(packages: readonly string[]): Rolldown.Plugin {
  const stubbed = new Set(packages)
  const STUB_PREFIX = '\0stub:'

  return {
    name: 'kidd-stub-packages',
    resolveId(source) {
      if (stubbed.has(source)) {
        return `${STUB_PREFIX}${source}`
      }
      return null
    },
    load(id) {
      if (id.startsWith(STUB_PREFIX)) {
        return 'export default undefined;'
      }
      return null
    },
  }
}

