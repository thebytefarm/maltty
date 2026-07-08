import type { Tagged } from '@maltty/utils/tag'
import { withTag } from '@maltty/utils/tag'

import type { MalttyConfig } from './types.js'

/**
 * Type-safe helper for maltty.config.ts.
 *
 * Tags the config with `'MalttyConfig'` so consumers can verify
 * it was created through `defineConfig` at runtime via `hasTag`.
 *
 * @param config - The build configuration object.
 * @returns A tagged copy of the config.
 */
export function defineConfig(config: MalttyConfig): Tagged<MalttyConfig, 'MalttyConfig'> {
  return withTag(config, 'MalttyConfig')
}
