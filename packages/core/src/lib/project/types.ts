/**
 * Source strategy for path resolution.
 */
export type PathSource = 'local' | 'global' | 'resolve'

/**
 * Options for resolving a directory path from local or global sources.
 */
export interface ResolvePathOptions {
  readonly dirName: string
  readonly source?: PathSource
  readonly startDir?: string
}
