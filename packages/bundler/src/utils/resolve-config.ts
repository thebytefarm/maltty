import { resolve } from 'node:path'

import type { CompileOptions, MalttyConfig } from '@maltty/config'

import {
  DEFAULT_CLEAN,
  DEFAULT_COMMANDS,
  DEFAULT_ENTRY,
  DEFAULT_MINIFY,
  DEFAULT_OUT_DIR,
  DEFAULT_SOURCEMAP,
  DEFAULT_TARGET,
} from '../constants.js'
import type { ResolvedBundlerConfig } from '../types.js'

/**
 * Normalize the `compile` config field from `boolean | CompileOptions | undefined` to `CompileOptions`.
 *
 * - `true` → `{}` (compile with defaults)
 * - `false` / `undefined` → `{}` (no explicit options, caller decides whether to compile)
 * - object → pass through
 *
 * @param value - The raw compile config value.
 * @returns A normalized CompileOptions object.
 */
export function normalizeCompileOptions(
  value: boolean | CompileOptions | undefined
): CompileOptions {
  if (typeof value === 'object') {
    return value
  }

  return {}
}

/**
 * Fill defaults and resolve relative paths against `cwd`.
 *
 * This is a pure function — the incoming config is already validated by `@maltty/config`.
 * It only fills missing optional fields with defaults and resolves paths to absolute.
 *
 * @param params - The raw config and working directory.
 * @returns A fully resolved bundler configuration.
 */
export function resolveConfig(params: {
  readonly config: MalttyConfig
  readonly cwd: string
  readonly version: string | undefined
  readonly binaryName: string
}): ResolvedBundlerConfig {
  const { config, cwd } = params

  const entry = resolve(cwd, config.entry ?? DEFAULT_ENTRY)
  const commands = resolve(cwd, config.commands ?? DEFAULT_COMMANDS)

  const buildOpts = config.build ?? {}
  const compileOpts = normalizeCompileOptions(config.compile)

  const buildOutDir = resolve(cwd, buildOpts.out ?? DEFAULT_OUT_DIR)
  const compileOutDir = resolve(cwd, compileOpts.out ?? DEFAULT_OUT_DIR)

  return {
    build: {
      clean: buildOpts.clean ?? DEFAULT_CLEAN,
      define: buildOpts.define ?? {},
      external: buildOpts.external ?? [],
      minify: buildOpts.minify ?? DEFAULT_MINIFY,
      sourcemap: buildOpts.sourcemap ?? DEFAULT_SOURCEMAP,
      target: buildOpts.target ?? DEFAULT_TARGET,
    },
    buildOutDir,
    commands,
    compile: {
      autoloadDotenv: compileOpts.autoloadDotenv ?? false,
      name: compileOpts.name ?? params.binaryName,
      targets: compileOpts.targets ?? [],
    },
    compileOutDir,
    cwd,
    entry,
    include: config.include ?? [],
    version: params.version,
  }
}
