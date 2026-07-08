import { useSyncExternalStore } from 'react'

import type { StoryRegistry } from '../../registry.js'
import type { StoryEntry } from '../../types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Subscribe to the story registry and return the current snapshot of all
 * registered story entries. Re-renders when the registry changes.
 *
 * @param registry - The story registry to observe.
 * @returns A read-only map of story entries keyed by name.
 */
export function useStories(registry: StoryRegistry): ReadonlyMap<string, StoryEntry> {
  return useSyncExternalStore(registry.subscribe, registry.getSnapshot)
}
