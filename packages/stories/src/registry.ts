import type { StoryEntry } from './types.js'

/**
 * A registry that stores discovered stories and supports subscriptions.
 *
 * Compatible with React's `useSyncExternalStore` via {@link StoryRegistry.subscribe}
 * and {@link StoryRegistry.getSnapshot}.
 */
export interface StoryRegistry {
  readonly getAll: () => ReadonlyMap<string, StoryEntry>
  readonly get: (name: string) => StoryEntry | undefined
  readonly set: (name: string, entry: StoryEntry) => void
  readonly remove: (name: string) => boolean
  readonly clear: () => void
  readonly subscribe: (listener: () => void) => () => void
  readonly getSnapshot: () => ReadonlyMap<string, StoryEntry>
}

/**
 * Create a story registry with subscribe/notify for React integration.
 *
 * The registry maintains an internal mutable map and a separate immutable
 * snapshot reference that is updated on every mutation. This allows
 * `useSyncExternalStore` to detect changes via reference equality.
 *
 * @returns A frozen {@link StoryRegistry} instance.
 */
export function createStoryRegistry(): StoryRegistry {
  const state = {
    entries: new Map<string, StoryEntry>(),
    listeners: new Set<() => void>(),
    snapshot: new Map<string, StoryEntry>() as ReadonlyMap<string, StoryEntry>,
  }

  return Object.freeze({
    getAll: (): ReadonlyMap<string, StoryEntry> => state.snapshot,

    get: (name: string): StoryEntry | undefined => state.entries.get(name),

    set: (name: string, entry: StoryEntry): void => {
      if (state.entries.get(name) === entry) {
        return
      }
      state.entries.set(name, entry)
      notify(state)
    },

    remove: (name: string): boolean => {
      const deleted = state.entries.delete(name)
      if (deleted) {
        notify(state)
      }
      return deleted
    },

    clear: (): void => {
      state.entries.clear()
      notify(state)
    },

    subscribe: (listener: () => void): (() => void) => {
      state.listeners.add(listener)
      return () => {
        state.listeners.delete(listener)
      }
    },

    getSnapshot: (): ReadonlyMap<string, StoryEntry> => state.snapshot,
  })
}

// ---------------------------------------------------------------------------

/**
 * Internal state shape for the registry.
 *
 * @private
 */
interface RegistryState {
  readonly entries: Map<string, StoryEntry>
  readonly listeners: Set<() => void>
  snapshot: ReadonlyMap<string, StoryEntry>
}

/**
 * Update the snapshot and notify all subscribers.
 *
 * @private
 * @param state - The mutable registry state.
 */
function notify(state: RegistryState): void {
  state.snapshot = Object.freeze(new Map(state.entries)) as ReadonlyMap<string, StoryEntry>
  const _notified = [...state.listeners].map((listener) => {
    listener()
    return true
  })
}
