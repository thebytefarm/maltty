import type { ResultAsync } from '@maltty/utils'
import { err, ok, toError } from '@maltty/utils/fp'
import type { Tagged } from '@maltty/utils/tag'
import { withTag } from '@maltty/utils/tag'
import { loadConfig as c12LoadConfig } from 'c12'
import { attemptAsync } from 'es-toolkit'

import type { MalttyConfig } from '../types.js'
import { validateConfig } from './schema.js'

export { MalttyConfigSchema, validateConfig } from './schema.js'

/**
 * Options for loading a maltty build config.
 */
export interface LoadConfigOptions {
  /**
   * Working directory to search from.
   */
  readonly cwd?: string
  /**
   * Default values merged under the loaded config.
   */
  readonly defaults?: Partial<MalttyConfig>
  /**
   * Override values merged over the loaded config.
   */
  readonly overrides?: Partial<MalttyConfig>
}

/**
 * Successful result of loading a maltty build config.
 */
export interface LoadConfigResult {
  /**
   * The validated and tagged build config.
   */
  readonly config: Tagged<MalttyConfig, 'MalttyConfig'>
  /**
   * Path to the resolved config file, or `undefined` when none was found.
   */
  readonly configFile: string | undefined
}

/**
 * Load and validate a `maltty.config.ts` file using c12.
 *
 * Searches for a config file named `maltty` (e.g. `maltty.config.ts`, `maltty.config.mts`)
 * in the given working directory, validates it against the build config schema,
 * and returns a tagged config object.
 *
 * @param options - Optional loader configuration.
 * @returns A Result tuple - `[null, LoadConfigResult]` on success or `[Error, null]` on failure.
 */
export async function loadConfig(
  options?: LoadConfigOptions
): ResultAsync<LoadConfigResult, Error> {
  const { cwd, defaults, overrides } = options ?? {}

  const [loadError, loaded] = await attemptAsync(() =>
    c12LoadConfig({
      cwd,
      defaults,
      name: 'maltty',
      overrides,
    })
  )

  if (loadError) {
    return err(`Failed to load maltty config: ${toError(loadError).message}`)
  }

  if (!loaded) {
    return err('Failed to load maltty config: no configuration was returned')
  }

  const [validateError, config] = validateConfig(loaded.config)
  if (validateError) {
    return err(validateError)
  }

  return ok({
    config: withTag(config, 'MalttyConfig'),
    configFile: loaded.configFile,
  })
}
