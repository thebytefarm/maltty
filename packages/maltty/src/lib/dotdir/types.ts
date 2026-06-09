import type { Result } from '@maltty/utils/fp'
import type { z } from 'zod'

// ---------------------------------------------------------------------------
// DotDirectoryLocation
// ---------------------------------------------------------------------------

/**
 * The scope of a dot directory — either project-local or user-global.
 */
export type DotDirectoryLocation = 'local' | 'global'

// ---------------------------------------------------------------------------
// DotDirectoryError
// ---------------------------------------------------------------------------

/**
 * Error returned by dot directory operations.
 */
export interface DotDirectoryError {
  readonly type:
    | 'no_project_root'
    | 'protected_file'
    | 'path_traversal'
    | 'fs_error'
    | 'parse_error'
  readonly message: string
}

// ---------------------------------------------------------------------------
// ProtectedFileEntry
// ---------------------------------------------------------------------------

/**
 * A file registered as protected by middleware.
 */
export interface ProtectedFileEntry {
  readonly location: DotDirectoryLocation
  readonly filename: string
}

// ---------------------------------------------------------------------------
// AccessOptions
// ---------------------------------------------------------------------------

/**
 * Base options for any operation that touches file contents.
 */
export interface AccessOptions {
  readonly dangerouslyAccessProtectedFile?: boolean
}

// ---------------------------------------------------------------------------
// WriteOptions
// ---------------------------------------------------------------------------

/**
 * Options for write operations. Extends {@link AccessOptions}.
 */
export interface WriteOptions extends AccessOptions {}

// ---------------------------------------------------------------------------
// ReadJsonOptions
// ---------------------------------------------------------------------------

/**
 * Options for reading and parsing JSON files, with optional Zod validation.
 *
 * @typeParam T - The expected parsed type.
 */
export interface ReadJsonOptions<T = unknown> extends AccessOptions {
  readonly schema?: z.ZodType<T>
}

// ---------------------------------------------------------------------------
// DotDirectoryClient
// ---------------------------------------------------------------------------

/**
 * A scoped filesystem handle for a single dot directory.
 *
 * Provides read, write, exists, remove, and path resolution operations
 * that respect the shared protection registry.
 */
export interface DotDirectoryClient {
  readonly dir: string
  readonly ensure: () => Result<string, DotDirectoryError>
  readonly read: (filename: string, options?: AccessOptions) => Result<string, DotDirectoryError>
  readonly write: (
    filename: string,
    content: string,
    options?: WriteOptions
  ) => Result<string, DotDirectoryError>
  readonly readJson: <T = unknown>(
    filename: string,
    options?: ReadJsonOptions<T>
  ) => Result<T, DotDirectoryError>
  readonly writeJson: (
    filename: string,
    data: unknown,
    options?: WriteOptions
  ) => Result<string, DotDirectoryError>
  readonly exists: (filename: string) => boolean
  readonly remove: (filename: string, options?: AccessOptions) => Result<string, DotDirectoryError>
  readonly path: (filename: string) => Result<string, DotDirectoryError>
}

// ---------------------------------------------------------------------------
// DotDirectory
// ---------------------------------------------------------------------------

/**
 * Root dot directory manager for obtaining scoped {@link DotDirectoryClient}
 * handles and managing the protection registry.
 */
export interface DotDirectory {
  readonly global: () => DotDirectoryClient
  readonly local: () => Result<DotDirectoryClient, DotDirectoryError>
  readonly protect: (entry: ProtectedFileEntry) => void
}

// ---------------------------------------------------------------------------
// ProtectionRegistry (internal)
// ---------------------------------------------------------------------------

/**
 * Internal registry tracking files that middleware has marked as protected.
 */
export interface ProtectionRegistry {
  readonly add: (entry: ProtectedFileEntry) => void
  readonly has: (location: DotDirectoryLocation, filename: string) => boolean
}
