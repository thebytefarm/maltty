import type { MalttyConfig } from '@maltty/config'
import type { LoadConfigResult } from '@maltty/config/utils'

/**
 * Extract a MalttyConfig from a load result, falling back to empty defaults.
 *
 * @param result - The result from loadConfig, or null when loading failed.
 * @returns The loaded config or an empty object (all MalttyConfig fields are optional).
 */
export function extractConfig(result: LoadConfigResult | null): MalttyConfig {
  if (result) {
    return result.config
  }

  return {}
}
