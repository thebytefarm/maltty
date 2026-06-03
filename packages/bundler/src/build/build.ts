import { err, ok } from '@maltty/utils/fp'
import { attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { resolveBuildVars, toTsdownBuildConfig } from './config.js'
import { clean } from '../utils/clean.js'
import { formatBuildError } from '../utils/format-error.js'
import { resolveBuildEntry } from '../utils/resolve-build-entry.js'
import type { AsyncBundlerResult, BuildOutput, ResolvedBundlerConfig } from '../types.js'

/**
 * Run the tsdown build with a resolved config.
 *
 * Cleans artifacts when enabled, maps to a tsdown InlineConfig, and invokes
 * tsdown's build API.
 *
 * @param params - The resolved config and whether compile mode is active.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly compile: boolean
  readonly verbose?: boolean
}): AsyncBundlerResult<BuildOutput> {
  if (params.resolved.build.clean) {
    await clean({ resolved: params.resolved, compile: params.compile })
  }

  const inlineConfig = toTsdownBuildConfig({
    compile: params.compile,
    config: params.resolved,
  })

  const [buildError] = await attemptAsync(() => tsdownBuild(inlineConfig))
  if (buildError) {
    return err(
      new Error(
        formatBuildError({ phase: 'build', error: buildError, verbose: params.verbose ?? false }),
        { cause: buildError }
      )
    )
  }

  const entryFile = await resolveBuildEntry(params.resolved.buildOutDir)

  if (!entryFile) {
    return err(new Error(`build produced no entry file in ${params.resolved.buildOutDir}`))
  }

  return ok({
    define: { ...resolveBuildVars(), ...params.resolved.build.define },
    entryFile,
    outDir: params.resolved.buildOutDir,
    version: params.resolved.version,
  })
}
