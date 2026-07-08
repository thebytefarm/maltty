import type { DotDirectoryLocation, ProtectedFileEntry, ProtectionRegistry } from './types.js'

/**
 * Create a {@link ProtectionRegistry} backed by a `Set<string>`.
 *
 * Keys are serialized as `"location:filename"`. The registry is shared
 * by reference across all `DotDirectoryClient` instances from the same `DotDirectory`.
 *
 * @returns A frozen ProtectionRegistry instance.
 */
export function createProtectionRegistry(): ProtectionRegistry {
  const entries = new Set<string>()

  return Object.freeze({
    add(entry: ProtectedFileEntry): void {
      entries.add(toKey(entry.location, entry.filename))
    },
    has(location: DotDirectoryLocation, filename: string): boolean {
      return entries.has(toKey(location, filename))
    },
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a location and filename into a registry key.
 *
 * @private
 * @param location - The directory location.
 * @param filename - The filename.
 * @returns A colon-delimited key string.
 */
function toKey(location: DotDirectoryLocation, filename: string): string {
  return `${location}:${filename}`
}
