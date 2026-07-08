import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

import { attempt } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import { jsonParse, jsonStringify } from '@maltty/utils/json'

import type {
  AccessOptions,
  DotDirectoryClient,
  DotDirectoryError,
  DotDirectoryLocation,
  ProtectionRegistry,
  ReadJsonOptions,
  WriteOptions,
} from './types.js'

/**
 * Create a scoped {@link DotDirectoryClient} for a single resolved directory.
 *
 * All filesystem operations are synchronous (consistent with {@link FileStore}).
 * Protected files are checked against the shared {@link ProtectionRegistry}.
 * Filenames are validated to prevent path traversal outside the scoped directory.
 *
 * @param options - Directory path, location scope, and protection registry.
 * @returns A frozen DotDirectoryClient instance.
 */
export function createDotDirectoryClient(options: {
  readonly dir: string
  readonly location: DotDirectoryLocation
  readonly registry: ProtectionRegistry
}): DotDirectoryClient {
  const { dir, location, registry } = options
  const resolvedDir = resolve(dir)

  /**
   * Resolve a filename and validate it stays within the scoped directory.
   *
   * @private
   * @param filename - The filename to resolve.
   * @returns A Result with the resolved path on success, or a path_traversal error.
   */
  function safePath(filename: string): Result<string, DotDirectoryError> {
    const resolved = resolve(resolvedDir, filename)
    if (!resolved.startsWith(resolvedDir + sep) && resolved !== resolvedDir) {
      return [
        {
          message: `Path "${filename}" escapes the dot directory boundary.`,
          type: 'path_traversal',
        },
        null,
      ]
    }

    const [, stat] = attempt(() => lstatSync(resolved))
    if (stat && stat.isSymbolicLink()) {
      return [
        {
          message: `Path "${filename}" is a symbolic link, which is not allowed.`,
          type: 'path_traversal',
        },
        null,
      ]
    }

    return [null, resolved]
  }

  /**
   * Check whether a file is protected and access was not explicitly opted-in.
   *
   * @private
   * @param filename - The filename to check.
   * @param accessOptions - Access options that may include the bypass flag.
   * @returns A DotDirectoryError if the file is protected, or null.
   */
  function checkProtection(
    filename: string,
    accessOptions?: AccessOptions
  ): DotDirectoryError | null {
    if (accessOptions !== undefined && accessOptions.dangerouslyAccessProtectedFile === true) {
      return null
    }

    if (registry.has(location, filename)) {
      return {
        message: `File "${filename}" is protected in ${location} scope. Pass { dangerouslyAccessProtectedFile: true } to access it.`,
        type: 'protected_file',
      }
    }

    return null
  }

  /**
   * Ensure the directory exists, creating it with mode 0o700 if needed.
   *
   * @private
   * @returns A Result with the directory path on success.
   */
  function ensure(): Result<string, DotDirectoryError> {
    const [error] = attempt<void, Error>(() => {
      mkdirSync(resolvedDir, { mode: 0o700, recursive: true })
    })

    if (error) {
      return [
        {
          message: `Failed to create directory "${resolvedDir}": ${error.message}`,
          type: 'fs_error',
        },
        null,
      ]
    }

    return [null, resolvedDir]
  }

  /**
   * Read a file as a raw string.
   *
   * @private
   * @param filename - The filename to read.
   * @param accessOptions - Access options.
   * @returns A Result with the file content on success.
   */
  function read(
    filename: string,
    accessOptions?: AccessOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, accessOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const [pathError, filePath] = safePath(filename)
    if (pathError) {
      return [pathError, null]
    }

    const [error, content] = attempt<string, Error>(() => readFileSync(filePath, 'utf8'))

    if (error) {
      return [{ message: `Failed to read "${filePath}": ${error.message}`, type: 'fs_error' }, null]
    }

    return [null, content] as const
  }

  /**
   * Write a raw string to a file (mode 0o600). Creates the directory if needed.
   *
   * @private
   * @param filename - The filename to write.
   * @param content - The string content.
   * @param writeOptions - Write options.
   * @returns A Result with the written file path on success.
   */
  function write(
    filename: string,
    content: string,
    writeOptions?: WriteOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, writeOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const [pathError, filePath] = safePath(filename)
    if (pathError) {
      return [pathError, null]
    }

    const [ensureError] = ensure()
    if (ensureError) {
      return [ensureError, null]
    }

    const [error] = attempt<void, Error>(() => {
      writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
    })

    if (error) {
      return [
        { message: `Failed to write "${filePath}": ${error.message}`, type: 'fs_error' },
        null,
      ]
    }

    return [null, filePath]
  }

  /**
   * Read and parse a JSON file, optionally validating with a Zod schema.
   *
   * @private
   * @param filename - The filename to read.
   * @param readOptions - Read options with optional schema.
   * @returns A Result with the parsed (and optionally validated) data.
   */
  function readJson<T = unknown>(
    filename: string,
    readOptions?: ReadJsonOptions<T>
  ): Result<T, DotDirectoryError> {
    const [readError, content] = read(filename, readOptions)
    if (readError) {
      return [readError, null]
    }

    const [parseError, parsed] = jsonParse(content)
    if (parseError) {
      return [
        { message: `Failed to parse "${filename}": ${parseError.message}`, type: 'parse_error' },
        null,
      ]
    }

    if (readOptions !== undefined && readOptions.schema !== undefined) {
      const result = readOptions.schema.safeParse(parsed)
      if (!result.success) {
        return [
          {
            message: `Validation failed for "${filename}": ${result.error.message}`,
            type: 'parse_error',
          },
          null,
        ]
      }
      return [null, result.data]
    }

    return [null, parsed as T]
  }

  /**
   * Serialize data to JSON and write it to a file.
   *
   * @private
   * @param filename - The filename to write.
   * @param data - The data to serialize.
   * @param writeOptions - Write options.
   * @returns A Result with the written file path on success.
   */
  function writeJson(
    filename: string,
    data: unknown,
    writeOptions?: WriteOptions
  ): Result<string, DotDirectoryError> {
    const [stringifyError, json] = jsonStringify(data, { pretty: true })
    if (stringifyError) {
      return [
        {
          message: `Failed to serialize "${filename}": ${stringifyError.message}`,
          type: 'parse_error',
        },
        null,
      ]
    }

    return write(filename, json, writeOptions)
  }

  /**
   * Check whether a file exists in the directory.
   *
   * @private
   * @param filename - The filename to check.
   * @returns True if the file exists and the path is within the directory boundary.
   */
  function fileExists(filename: string): boolean {
    const [pathError, filePath] = safePath(filename)
    if (pathError) {
      return false
    }
    return existsSync(filePath)
  }

  /**
   * Remove a file from the directory. Idempotent — succeeds if the file does not exist.
   *
   * @private
   * @param filename - The filename to remove.
   * @param accessOptions - Access options.
   * @returns A Result with the file path on success.
   */
  function remove(
    filename: string,
    accessOptions?: AccessOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, accessOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const [pathError, filePath] = safePath(filename)
    if (pathError) {
      return [pathError, null]
    }

    if (!existsSync(filePath)) {
      return [null, filePath]
    }

    const [error] = attempt<void, Error>(() => {
      unlinkSync(filePath)
    })

    if (error) {
      return [
        { message: `Failed to remove "${filePath}": ${error.message}`, type: 'fs_error' },
        null,
      ]
    }

    return [null, filePath]
  }

  /**
   * Resolve the full absolute path for a filename within the directory.
   *
   * Validates the filename against path traversal and symlink checks
   * via {@link safePath}.
   *
   * @private
   * @param filename - The filename to resolve.
   * @returns A Result with the absolute path on success, or a path_traversal error.
   */
  function resolvePath(filename: string): Result<string, DotDirectoryError> {
    return safePath(filename)
  }

  return Object.freeze({
    dir: resolvedDir,
    ensure,
    exists: fileExists,
    path: resolvePath,
    read,
    readJson,
    remove,
    write,
    writeJson,
  })
}
