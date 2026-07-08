import { glob } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { StoryImporter } from './importer.js'
import type { StoryEntry } from './types.js'
import { STORY_FILE_SUFFIXES } from './types.js'

/**
 * Options for story discovery.
 */
export interface DiscoverOptions {
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
  readonly cwd?: string
  readonly importer: StoryImporter
}

/**
 * Result of a story discovery scan.
 */
export interface DiscoverResult {
  readonly entries: ReadonlyMap<string, StoryEntry>
  readonly errors: readonly DiscoverError[]
}

/**
 * An error encountered during story discovery.
 */
export interface DiscoverError {
  readonly filePath: string
  readonly message: string
}

/** Default include patterns for story file discovery. */
const DEFAULT_INCLUDE: readonly string[] = STORY_FILE_SUFFIXES.map((suffix) => `src/**/*${suffix}`)

/**
 * Default exclude patterns for story file discovery.
 */
const DEFAULT_EXCLUDE: readonly string[] = ['node_modules/**']

/**
 * Discover story files matching the given patterns and import them.
 *
 * Uses Node 22+ `glob` from `node:fs/promises` for file matching. Each
 * discovered file is imported via the provided {@link StoryImporter}.
 *
 * @param options - Discovery options including patterns and importer.
 * @returns A {@link DiscoverResult} with entries map and any errors.
 */
export async function discoverStories(options: DiscoverOptions): Promise<DiscoverResult> {
  const patterns = options.include ?? DEFAULT_INCLUDE
  const cwd = options.cwd ?? process.cwd()
  const exclude = options.exclude ?? DEFAULT_EXCLUDE

  const filePaths = await collectFilePaths(patterns, cwd, exclude)

  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const absolutePath = resolve(cwd, filePath)
      const [importError, entry] = await options.importer.importStory(absolutePath)

      if (importError) {
        return { error: { filePath: absolutePath, message: importError.message } as DiscoverError }
      }

      return { entry: [absolutePath, entry] as const }
    })
  )

  const entries = new Map<string, StoryEntry>(
    results.filter(hasEntry).map((result) => result.entry)
  )

  const errors = results.filter(hasError).map((result) => result.error)

  return Object.freeze({
    entries,
    errors: Object.freeze(errors),
  })
}

// ---------------------------------------------------------------------------

/**
 * Collect file paths matching the given glob patterns.
 *
 * @private
 * @param patterns - Glob patterns to match.
 * @param cwd - Working directory for glob resolution.
 * @param exclude - Patterns to exclude.
 * @returns A flat array of matching file paths.
 */
async function collectFilePaths(
  patterns: readonly string[],
  cwd: string,
  exclude: readonly string[]
): Promise<readonly string[]> {
  const nested = await Promise.all(
    patterns.map((pattern) => collectAsyncIterable(glob(pattern, { cwd, exclude: [...exclude] })))
  )
  return nested.flat()
}

/**
 * Drain an async iterable into an array.
 *
 * @private
 * @param iterable - The async iterable to consume.
 * @returns A promise resolving to an array of all yielded values.
 */
async function collectAsyncIterable<T>(iterable: AsyncIterable<T>): Promise<readonly T[]> {
  const results: T[] = []
  const iterator = iterable[Symbol.asyncIterator]()
  const drain = async (): Promise<readonly T[]> => {
    const next = await iterator.next()
    if (next.done) {
      return results
    }
    results.push(next.value)
    return drain()
  }
  return drain()
}

/**
 * Type guard for results that contain an entry.
 *
 * @private
 * @param result - The result to check.
 * @returns `true` when the result has an `entry` property.
 */
function hasEntry(
  result: { entry: readonly [string, StoryEntry] } | { error: DiscoverError }
): result is { entry: readonly [string, StoryEntry] } {
  return 'entry' in result
}

/**
 * Type guard for results that contain an error.
 *
 * @private
 * @param result - The result to check.
 * @returns `true` when the result has an `error` property.
 */
function hasError(
  result: { entry: readonly [string, StoryEntry] } | { error: DiscoverError }
): result is { error: DiscoverError } {
  return 'error' in result
}
