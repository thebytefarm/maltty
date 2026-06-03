import { readManifest } from '@maltty/utils/manifest'
import { isNil, noop } from 'es-toolkit'
import { match, P } from 'ts-pattern'

import { build } from './build/build.js'
import { watch } from './build/watch.js'
import { compile } from './compile/compile.js'
import type {
  AsyncBundlerResult,
  BuildOutput,
  BuildOverrides,
  Bundler,
  BundlerLifecycle,
  CompileOutput,
  CompileOverrides,
  CreateBundlerParams,
  WatchOverrides,
} from './types.js'
import { resolveConfig } from './utils/resolve-config.js'

/**
 * Create a bundler instance for a maltty CLI project.
 *
 * Reads the project manifest once, resolves config, and returns methods
 * that share the resolved state. Lifecycle hooks fire at phase boundaries.
 * Per-call overrides replace base hooks for that invocation.
 *
 * @param params - The config, working directory, and optional lifecycle hooks.
 * @returns A bundler with build, watch, and compile methods.
 */
export async function createBundler(params: CreateBundlerParams): Promise<Bundler> {
  const [, manifest] = await readManifest(params.cwd)
  const { version, name: packageName } = manifest ?? {}

  const binaryName = match(params.config.compile)
    .with({ name: P.string }, (c) => c.name)
    .otherwise(() => resolveBinaryName(packageName))

  const resolved = resolveConfig({
    config: params.config,
    cwd: params.cwd,
    version,
    binaryName,
  })
  const hasCompile = !isNil(params.config.compile)

  const baseLifecycle: BundlerLifecycle = {
    onFinish: params.onFinish,
    onStart: params.onStart,
    onStepFinish: params.onStepFinish,
    onStepStart: params.onStepStart,
  }

  return {
    build: async (overrides: BuildOverrides = {}): AsyncBundlerResult<BuildOutput> => {
      const lifecycle = resolveLifecycle(baseLifecycle, overrides)
      await lifecycle.onStart({ phase: 'build' })
      const result = await build({ compile: hasCompile, resolved, verbose: overrides.verbose })
      await lifecycle.onFinish({ phase: 'build' })
      return result
    },

    watch: async (overrides: WatchOverrides = {}): AsyncBundlerResult<void> => {
      const lifecycle = resolveLifecycle(baseLifecycle, overrides)
      await lifecycle.onStart({ phase: 'watch' })
      const result = await watch({
        onSuccess: overrides.onSuccess,
        resolved,
        verbose: overrides.verbose,
      })
      await lifecycle.onFinish({ phase: 'watch' })
      return result
    },

    compile: async (overrides: CompileOverrides = {}): AsyncBundlerResult<CompileOutput> => {
      const lifecycle = resolveLifecycle(baseLifecycle, overrides)
      await lifecycle.onStart({ phase: 'compile' })
      const result = await compile({ lifecycle, resolved, verbose: overrides.verbose })
      await lifecycle.onFinish({ phase: 'compile' })
      return result
    },
  }
}

/**
 * Derive the binary name from the package.json name, stripping scope.
 *
 * @private
 * @param packageName - The package name from manifest, or undefined.
 * @returns The binary name.
 */
function resolveBinaryName(packageName: string | undefined): string {
  if (!packageName) {
    return 'cli'
  }

  return stripScope(packageName)
}

/**
 * Strip the npm scope prefix from a package name.
 *
 * @private
 * @param name - The package name (e.g. `@scope/my-cli`).
 * @returns The unscoped name (e.g. `my-cli`).
 */
function stripScope(name: string): string {
  const slashIndex = name.indexOf('/')
  if (name.startsWith('@') && slashIndex > 0) {
    return name.slice(slashIndex + 1)
  }

  return name
}

/**
 * Merge base lifecycle hooks with per-call overrides.
 *
 * Per-call hooks replace base hooks (no chaining). Missing hooks
 * are filled with no-ops so callers don't need null checks.
 *
 * @private
 * @param base - The base lifecycle hooks from the factory.
 * @param overrides - Per-call hook overrides.
 * @returns A lifecycle with all hooks guaranteed to be defined.
 */
function resolveLifecycle(
  base: BundlerLifecycle,
  overrides: BundlerLifecycle = {}
): Required<BundlerLifecycle> {
  return {
    onFinish: overrides.onFinish ?? base.onFinish ?? noop,
    onStart: overrides.onStart ?? base.onStart ?? noop,
    onStepFinish: overrides.onStepFinish ?? base.onStepFinish ?? noop,
    onStepStart: overrides.onStepStart ?? base.onStepStart ?? noop,
  }
}
