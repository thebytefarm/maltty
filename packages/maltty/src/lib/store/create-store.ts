import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { attempt, err, match, ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import { jsonParse, jsonStringify } from '@maltty/utils/json'

import { resolveGlobalPath, resolveLocalPath } from '@/lib/project/index.js'
import type { PathSource } from '@/lib/project/types.js'

import type { FileStore, LoadOptions, SaveOptions, StoreOptions } from './types.js'

/**
 * Create a file-backed {@link FileStore} that resolves JSON files from project-local
 * or global home directories.
 *
 * @param options - Store configuration.
 * @returns A FileStore instance.
 */
export function createStore<TData = unknown>(options: StoreOptions<TData>): FileStore<TData> {
  const { dirName, defaults } = options

  /**
   * Resolve the local project directory for the store.
   *
   * @private
   * @param startDir - Optional directory to start searching from.
   * @returns The local directory path, or null if no project root is found.
   */
  function getLocalDir(startDir?: string): string | null {
    return resolveLocalPath({ dirName, startDir })
  }

  /**
   * Resolve the global home directory for the store.
   *
   * @private
   * @returns The global directory path.
   */
  function getGlobalDir(): string {
    return resolveGlobalPath({ dirName })
  }

  /**
   * Read the raw string content from a file path.
   *
   * @private
   * @param filePath - The file path to read.
   * @returns The file content, or null if the file does not exist or cannot be read.
   */
  function loadFromPath(filePath: string): string | null {
    const [error, content] = attempt(() => readFileSync(filePath, 'utf8'))

    if (error) {
      return null
    }

    return content
  }

  /**
   * Resolve a file from local or global directories based on the source strategy.
   *
   * @private
   * @param resolveOptions - Resolution options.
   * @returns The resolved result, or null if not found.
   */
  function resolveFromSource<T>(resolveOptions: {
    source: PathSource
    localDir: string | null
    globalDir: string
    filename: string
    handler: (filePath: string) => T | null
  }): T | null {
    return match(resolveOptions.source)
      .with('local', (): T | null => {
        if (!resolveOptions.localDir) {
          return null
        }
        return resolveOptions.handler(join(resolveOptions.localDir, resolveOptions.filename))
      })
      .with('global', () =>
        resolveOptions.handler(join(resolveOptions.globalDir, resolveOptions.filename))
      )
      .with('resolve', (): T | null => {
        if (resolveOptions.localDir) {
          const localResult = resolveOptions.handler(
            join(resolveOptions.localDir, resolveOptions.filename)
          )
          if (localResult !== null) {
            return localResult
          }
        }
        return resolveOptions.handler(join(resolveOptions.globalDir, resolveOptions.filename))
      })
      .exhaustive()
  }

  /**
   * Load the raw string content of a store file.
   *
   * @private
   * @param filename - The filename to load.
   * @param loadOptions - Options controlling source resolution.
   * @returns The raw file content, or null if not found.
   */
  function loadRaw(filename: string, loadOptions: LoadOptions = {}): string | null {
    const { source: loadSource = 'resolve', startDir } = loadOptions
    const localDir = getLocalDir(startDir)
    const globalDir = getGlobalDir()

    return resolveFromSource<string>({
      filename,
      globalDir,
      handler: loadFromPath,
      localDir,
      source: loadSource,
    })
  }

  /**
   * Load and parse a store file as JSON, merging with defaults if available.
   *
   * @private
   * @param filename - The filename to load.
   * @param loadOptions - Options controlling source resolution.
   * @returns The parsed data, defaults, or null.
   */
  function load(filename: string, loadOptions: LoadOptions = {}): TData | null {
    const raw = loadRaw(filename, loadOptions)

    if (raw === null) {
      return defaults ?? null
    }

    const [parseError, parsed] = jsonParse(raw)
    if (parseError) {
      return defaults ?? null
    }

    if (defaults) {
      return { ...defaults, ...(parsed as Partial<TData>) }
    }
    return parsed as TData
  }

  /**
   * Check if a file exists at the given path and return the path if so.
   *
   * @private
   * @param filePath - The file path to check.
   * @returns The file path if it exists, or null.
   */
  function checkFileExists(filePath: string): string | null {
    if (existsSync(filePath)) {
      return filePath
    }
    return null
  }

  /**
   * Resolve the file path for a store file without reading its content.
   *
   * @private
   * @param filename - The filename to resolve.
   * @param loadOptions - Options controlling source resolution.
   * @returns The resolved file path, or null if not found.
   */
  function getFilePath(filename: string, loadOptions: LoadOptions = {}): string | null {
    const { source: fileSource = 'resolve', startDir } = loadOptions
    const localDir = getLocalDir(startDir)
    const globalDir = getGlobalDir()

    return resolveFromSource<string>({
      filename,
      globalDir,
      handler: checkFileExists,
      localDir,
      source: fileSource,
    })
  }

  /**
   * Serialize data to JSON and write it to a store file.
   *
   * Creates the target directory if it does not exist. Defaults to
   * the global home directory when no source is specified.
   *
   * @private
   * @param filename - The filename to write.
   * @param data - The data to serialize.
   * @param saveOptions - Options controlling the write target.
   * @returns A Result with the written file path on success.
   */
  function save(filename: string, data: unknown, saveOptions: SaveOptions = {}): Result<string> {
    const { source: saveSource = 'global', startDir } = saveOptions

    const dir = resolveSaveDir({
      globalDir: getGlobalDir(),
      localDir: getLocalDir(startDir),
      source: saveSource,
    })

    if (dir === null) {
      return err(new Error(`Cannot save to "${saveSource}" — no local project directory found`))
    }

    const [stringifyError, json] = jsonStringify(data, { pretty: true })

    if (stringifyError) {
      return err(stringifyError)
    }

    const filePath = join(dir, filename)

    const [writeError] = attempt(() => {
      mkdirSync(dir, { mode: 0o700, recursive: true })
      writeFileSync(filePath, json, { encoding: 'utf8', mode: 0o600 })
    })

    if (writeError) {
      return err(writeError)
    }

    return ok(filePath)
  }

  /**
   * Remove a file from the store.
   *
   * Returns `ok(filePath)` when the file was deleted or did not exist
   * (idempotent). Returns an error when the target directory cannot be
   * resolved or the unlink fails.
   *
   * @private
   * @param filename - The filename to remove.
   * @param removeOptions - Options controlling the removal target.
   * @returns A Result with the file path on success.
   */
  function remove(filename: string, removeOptions: SaveOptions = {}): Result<string> {
    const { source: removeSource = 'global', startDir } = removeOptions

    const dir = resolveSaveDir({
      globalDir: getGlobalDir(),
      localDir: getLocalDir(startDir),
      source: removeSource,
    })

    if (dir === null) {
      return err(
        new Error(`Cannot remove from "${removeSource}" — no local project directory found`)
      )
    }

    const filePath = join(dir, filename)

    if (!existsSync(filePath)) {
      return ok(filePath)
    }

    const [removeError] = attempt(() => {
      unlinkSync(filePath)
    })

    if (removeError) {
      return err(removeError)
    }

    return ok(filePath)
  }

  return {
    getFilePath,
    getGlobalDir,
    getLocalDir,
    load,
    loadRaw,
    remove,
    save,
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the target directory for a save operation.
 *
 * @private
 * @param options - Resolution options.
 * @returns The directory path, or null when `local` is requested but unavailable.
 */
function resolveSaveDir(options: {
  readonly localDir: string | null
  readonly globalDir: string
  readonly source: 'local' | 'global'
}): string | null {
  return match(options.source)
    .with('local', (): string | null => options.localDir)
    .with('global', () => options.globalDir)
    .exhaustive()
}
