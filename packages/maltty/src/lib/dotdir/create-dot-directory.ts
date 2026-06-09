import type { Result } from '@maltty/utils/fp'

import { resolveGlobalPath, resolveLocalPath } from '@/lib/project/index.js'
import type { ResolvedDirs } from '@/types/index.js'

import { createDotDirectoryClient } from './create-dot-directory-client.js'
import { createProtectionRegistry } from './protection.js'
import type {
  DotDirectory,
  DotDirectoryClient,
  DotDirectoryError,
  ProtectedFileEntry,
} from './types.js'

/**
 * Create a {@link DotDirectory} that returns scoped {@link DotDirectoryClient}
 * handles and manages a shared protection registry.
 *
 * @param options - The resolved directory names from `ctx.meta.dirs`.
 * @returns A frozen DotDirectory instance.
 */
export function createDotDirectory(options: { readonly dirs: ResolvedDirs }): DotDirectory {
  const { dirs } = options
  const registry = createProtectionRegistry()

  /**
   * Get a DotDirectoryClient scoped to the global home directory.
   *
   * @private
   * @returns A DotDirectoryClient for the global scope.
   */
  function global(): DotDirectoryClient {
    const dir = resolveGlobalPath({ dirName: dirs.global })
    return createDotDirectoryClient({ dir, location: 'global', registry })
  }

  /**
   * Get a DotDirectoryClient scoped to the project-local directory.
   *
   * @private
   * @returns A Result with a DotDirectoryClient on success, or a no_project_root error.
   */
  function local(): Result<DotDirectoryClient, DotDirectoryError> {
    const dir = resolveLocalPath({ dirName: dirs.local })
    if (dir === null) {
      return [{ message: 'No project root found', type: 'no_project_root' }, null]
    }
    return [null, createDotDirectoryClient({ dir, location: 'local', registry })]
  }

  /**
   * Register a file as protected in the shared registry.
   *
   * @private
   * @param entry - The file entry to protect.
   */
  function protect(entry: ProtectedFileEntry): void {
    registry.add(entry)
  }

  return Object.freeze({
    global,
    local,
    protect,
  })
}
