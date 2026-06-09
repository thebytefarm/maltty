import { useScreenContext } from '../provider.js'
import { getOutputStore } from './store-key.js'
import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Access the {@link OutputStore} attached to the current screen context.
 *
 * The store is attached by `screen()` via {@link injectOutputStore} and
 * retrieved here via {@link getOutputStore}.
 * Used internally by `<Output />` and available for advanced use cases
 * that need direct store access.
 *
 * @returns The output store for the current screen.
 */
export function useOutputStore(): OutputStore {
  const ctx = useScreenContext()
  return getOutputStore(ctx)
}
