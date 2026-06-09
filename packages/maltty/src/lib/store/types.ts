import type { Result } from '@maltty/utils/fp'

import type { PathSource } from '@/lib/project/types.js'

/**
 * Write-target for {@link FileStore.save}.
 *
 * Only `'local'` and `'global'` are valid — writes must target an
 * explicit directory (no automatic resolution).
 */
export type SaveSource = 'local' | 'global'

/**
 * Options for creating a file-backed store.
 */
export interface StoreOptions<TData> {
  dirName: string
  defaults?: TData
}

/**
 * Options for loading a file from the store.
 */
export interface LoadOptions {
  source?: PathSource
  startDir?: string
}

/**
 * Options for saving a file to the store.
 */
export interface SaveOptions {
  source?: SaveSource
  startDir?: string
}

/**
 * File-backed JSON store with local/global resolution.
 */
export interface FileStore<TData> {
  getLocalDir(startDir?: string): string | null
  getGlobalDir(): string
  load(filename: string, options?: LoadOptions): TData | null
  loadRaw(filename: string, options?: LoadOptions): string | null
  getFilePath(filename: string, options?: LoadOptions): string | null
  save(filename: string, data: unknown, options?: SaveOptions): Result<string>
  remove(filename: string, options?: SaveOptions): Result<string>
}
