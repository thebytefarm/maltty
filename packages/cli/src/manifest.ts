import { join } from 'node:path'

import type { ResultAsync } from '@maltty/utils/fp'
import { err, ok } from '@maltty/utils/fp'
import { readManifest } from '@maltty/utils/manifest'

/**
 * Validated CLI manifest with all required fields guaranteed present.
 */
export interface CLIManifest {
  readonly name: string
  readonly version: string
  readonly description: string
}

/**
 * Read and validate the CLI package manifest.
 *
 * Reads package.json one directory above `baseDir` (the dist output sits
 * one level below the package root) and ensures all required fields are
 * present. Returns an error Result if the manifest cannot be read or any
 * required field is missing.
 *
 * @param baseDir - The directory the CLI entry file lives in (typically `import.meta.dirname`).
 * @returns A Result tuple: error on failure, validated {@link CLIManifest} on success.
 */
export async function readCLIManifest(baseDir: string): ResultAsync<CLIManifest> {
  const [manifestError, manifest] = await readManifest(join(baseDir, '..'))

  if (manifestError) {
    return err(new Error(`Failed to read CLI manifest: ${manifestError.message}`))
  }

  if (!manifest.name) {
    return err(new Error('CLI manifest is missing required field: name'))
  }

  if (!manifest.version) {
    return err(new Error('CLI manifest is missing required field: version'))
  }

  if (!manifest.description) {
    return err(new Error('CLI manifest is missing required field: description'))
  }

  return ok({ description: manifest.description, name: manifest.name, version: manifest.version })
}
