import type { StoryEntry, StoryRegistry } from '@maltty/stories'
import { useSyncExternalStore } from 'react'

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
