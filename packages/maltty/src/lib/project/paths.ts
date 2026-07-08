import { homedir } from 'node:os'
import { join } from 'node:path'

import { match } from 'ts-pattern'

import { findProjectRoot } from './root.js'
import type { ResolvePathOptions } from './types.js'

/**
 * Resolve a directory path relative to the project root.
 *
 * @param options - Options containing the directory name and optional start directory.
 * @returns The resolved local path, or null if no project root is found.
 */
export function resolveLocalPath(options: {
  readonly dirName: string
  readonly startDir?: string
}): string | null {
  const projectRoot = findProjectRoot(options.startDir)
  if (!projectRoot) {
    return null
  }
  return join(projectRoot, options.dirName)
}

/**
 * Resolve a directory path relative to the user's home directory.
 *
 * @param options - Options containing the directory name.
 * @returns The resolved global path.
 */
export function resolveGlobalPath(options: { readonly dirName: string }): string {
  return join(homedir(), options.dirName)
}

/**
 * Resolve a directory path using the specified source strategy.
 *
 * When source is 'local', resolves relative to the project root.
 * When source is 'global', resolves relative to the home directory.
 * When source is 'resolve' (default), tries local first, falling back to global.
 *
 * @param options - Resolution options with dirName, source, and startDir.
 * @returns The resolved path, or null if local resolution fails with source='local'.
 */
export function resolvePath(options: ResolvePathOptions): string | null {
  const { dirName, source = 'resolve', startDir } = options
  return match(source)
    .with('local', (): string | null => resolveLocalPath({ dirName, startDir }))
    .with('global', (): string => resolveGlobalPath({ dirName }))
    .with('resolve', (): string => {
      const localPath = resolveLocalPath({ dirName, startDir })
      if (localPath) {
        return localPath
      }
      return resolveGlobalPath({ dirName })
    })
    .exhaustive()
}
