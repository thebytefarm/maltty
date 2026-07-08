import { err, ok } from '@maltty/utils/fp'
import { attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { toTsdownWatchConfig } from './config.js'
import type { AsyncBundlerResult, ResolvedBundlerConfig } from '../types.js'
import { formatBuildError } from '../utils/format-error.js'

/**
 * Start a watch-mode build using tsdown.
 *
 * The returned promise resolves only when tsdown's watch terminates (typically on process exit).
 *
 * @param params - The resolved config, optional success callback, and verbose flag.
 * @returns A result tuple with void on success or an Error on failure.
 */
export async function watch(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly onSuccess?: () => void | Promise<void>
  readonly verbose?: boolean
}): AsyncBundlerResult<void> {
  const watchConfig = toTsdownWatchConfig({
    config: params.resolved,
    onSuccess: params.onSuccess,
  })

  const [watchError] = await attemptAsync(() => tsdownBuild(watchConfig))
  if (watchError) {
    return err(
      new Error(
        formatBuildError({ phase: 'watch', error: watchError, verbose: params.verbose ?? false }),
        { cause: watchError }
      )
    )
  }

  return ok()
}
