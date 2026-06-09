import { createStore } from '@/lib/store/create-store.js'

import { authCredentialSchema } from '../schema.js'
import type { AuthCredential } from '../types.js'

/**
 * Resolve credentials from a JSON file on disk.
 *
 * Checks the local project directory first, then falls back to the
 * global home directory. Supports separate directory names for each
 * location so that `cli({ dirs: { local, global } })` is respected.
 *
 * @param options - Options with the filename and local/global directory names.
 * @returns A validated auth credential, or null if not found or invalid.
 */
export function resolveFromFile(options: {
  readonly filename: string
  readonly localDirName: string
  readonly globalDirName: string
}): AuthCredential | null {
  const localResult = loadAndValidate(options.localDirName, options.filename, 'local')

  if (localResult) {
    return localResult
  }

  return loadAndValidate(options.globalDirName, options.filename, 'global')
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Load a credential file from a specific source and validate it.
 *
 * @private
 * @param dirName - The directory name to resolve.
 * @param filename - The credential filename.
 * @param source - Whether to resolve from 'local' or 'global'.
 * @returns A validated auth credential, or null.
 */
function loadAndValidate(
  dirName: string,
  filename: string,
  source: 'local' | 'global'
): AuthCredential | null {
  const store = createStore({ dirName })
  const data = store.load(filename, { source })

  if (data === null) {
    return null
  }

  const result = authCredentialSchema.safeParse(data)

  if (!result.success) {
    return null
  }

  return result.data
}
