import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join } from 'node:path'

import { attemptAsync, err, match, ok } from '@maltty/utils/fp'
import { validate } from '@maltty/utils/validate'
import { loadConfig as c12LoadConfig } from 'c12'
import type { ZodTypeAny, output } from 'zod'

import { CONFIG_DATA_EXTENSIONS } from './constants.js'
import { getExtension, getFormat, serializeContent } from './serialize.js'
import type {
  ConfigClient,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigOperationResult,
  ConfigWriteOptions,
  ConfigWriteResult,
} from './types.js'

/**
 * C12 resolution result containing the loaded config and resolved file path.
 */
interface C12Result {
  readonly config: unknown
  readonly configFile?: string
}

/**
 * Create a typed config client that loads, validates, and writes config files.
 *
 * Uses c12 to resolve config files in two passes:
 *
 * 1. `name.config.*` — all formats (TS, JS, JSON, JSONC, YAML, TOML)
 * 2. `name.*` — data formats only (JSON, JSONC, YAML, TOML)
 *
 * @param options - Config client options including name and Zod schema.
 * @returns A {@link ConfigClient} client instance.
 */
export function createConfigClient<TSchema extends ZodTypeAny>(
  options: ConfigLoadOptions<TSchema>
): ConfigClient<output<TSchema>> {
  const { name, schema, searchPaths } = options

  /**
   * Resolve a config file via c12 for a single directory.
   *
   * @private
   * @param cwd - Directory to search in.
   * @param configFile - The base config file name (without extension).
   * @returns The c12 result, or null if nothing was found.
   */
  async function resolveFromDir(
    cwd: string,
    configFile: string
  ): Promise<ConfigOperationResult<C12Result | null>> {
    const [loadError, loaded] = await attemptAsync(() =>
      c12LoadConfig({
        configFile,
        cwd,
        dotenv: false,
        globalRc: false,
        name,
        packageJson: false,
        rcFile: false,
      })
    )
    if (loadError) {
      return err(`Failed to load config from ${cwd}: ${String(loadError)}`)
    }
    if (!loaded || !hasResolvedConfigFile(loaded.configFile)) {
      return ok(null)
    }
    return ok(loaded)
  }

  /**
   * Resolve a config file across searchPaths then cwd.
   *
   * @private
   * @param cwd - Working directory.
   * @param configFile - The base config file name (without extension).
   * @returns The c12 result, or null if nothing was found.
   */
  async function resolveConfig(
    cwd: string,
    configFile: string
  ): Promise<ConfigOperationResult<C12Result | null>> {
    if (searchPaths && searchPaths.length > 0) {
      const results = await Promise.all(searchPaths.map((dir) => resolveFromDir(dir, configFile)))
      const firstError = results.find(([e]) => e !== null)
      if (firstError) {
        return firstError
      }
      const found = results.find((r): r is readonly [null, C12Result] => r[1] !== null)
      if (found) {
        return found
      }
    }
    return resolveFromDir(cwd, configFile)
  }

  /**
   * Load config using c12 with two-pass resolution.
   *
   * First pass: `name.config.*` (all formats).
   * Second pass: `name.*` (data formats only — no TS/JS).
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns The c12 result, or null if nothing was found.
   */
  async function loadConfig(cwd: string): Promise<ConfigOperationResult<C12Result | null>> {
    const [longError, longForm] = await resolveConfig(cwd, `${name}.config`)
    if (longError) {
      return err(longError)
    }
    if (longForm && hasResolvedConfigFile(longForm.configFile)) {
      return ok(longForm)
    }

    const [shortError, shortForm] = await resolveConfig(cwd, name)
    if (shortError) {
      return err(shortError)
    }
    if (shortForm && hasResolvedConfigFile(shortForm.configFile)) {
      if (!isDataExtension(shortForm.configFile)) {
        return ok(null)
      }
      return ok(shortForm)
    }

    return ok(null)
  }

  /**
   * Find a config file in the given directory.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns The path to the config file, or null if not found.
   */
  async function find(cwd?: string): Promise<string | null> {
    const resolvedCwd = cwd ?? process.cwd()
    const [, result] = await loadConfig(resolvedCwd)
    if (result && hasResolvedConfigFile(result.configFile)) {
      return result.configFile
    }
    return null
  }

  /**
   * Load and validate a config file.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns A ConfigOperationResult with the loaded config, or null if not found.
   */
  async function load(
    cwd?: string
  ): Promise<ConfigOperationResult<ConfigLoadResult<output<TSchema>> | null>> {
    const resolvedCwd = cwd ?? process.cwd()
    const [loadError, result] = await loadConfig(resolvedCwd)
    if (loadError) {
      return err(loadError)
    }
    if (!result || !hasResolvedConfigFile(result.configFile)) {
      return ok(null)
    }
    return validateAndReturn(result.config, result.configFile)
  }

  /**
   * Validate and write config data to a file.
   *
   * Defaults to `name.config.jsonc` when no explicit path is given.
   *
   * @private
   * @param data - The config data to write.
   * @param writeOptions - Write options including path and format.
   * @returns A ConfigOperationResult with the write result.
   */
  async function write(
    data: output<TSchema>,
    writeOptions: ConfigWriteOptions = {}
  ): Promise<ConfigOperationResult<ConfigWriteResult>> {
    if (writeOptions.filePath) {
      const pathFormat = getFormat(writeOptions.filePath)
      if (pathFormat === 'ts' || pathFormat === 'js') {
        return err(
          `Cannot write config to ${writeOptions.filePath}: TS/JS formats are not writable`
        )
      }
    }

    const [validationError, validated] = validate({
      schema,
      params: data,
      createError: ({ message }) => new Error(`Invalid config data:\n${message}`),
    })
    if (validationError) {
      return err(validationError)
    }

    const resolvedFormat = match(writeOptions)
      .when(
        (opts) => opts.format !== null && opts.format !== undefined,
        (opts) => opts.format as NonNullable<typeof opts.format>
      )
      .when(
        (opts) => opts.filePath !== null && opts.filePath !== undefined,
        (opts) => getWriteFormat(opts.filePath as string)
      )
      .otherwise(() => 'jsonc' as const)

    const resolvedFilePath = match(writeOptions.filePath)
      .when(
        (fp) => fp !== null && fp !== undefined,
        (fp) => fp as string
      )
      .otherwise(() => {
        const dir = writeOptions.dir ?? process.cwd()
        const ext = getExtension(resolvedFormat)
        return join(dir, `${name}.config${ext}`)
      })

    const [serializeError, serialized] = serializeContent(validated, resolvedFormat)
    if (serializeError) {
      return err(serializeError)
    }

    const [mkdirError] = await attemptAsync(() =>
      mkdir(dirname(resolvedFilePath), { recursive: true })
    )
    if (mkdirError) {
      return err(`Failed to create directory for ${resolvedFilePath}: ${String(mkdirError)}`)
    }

    const [writeError] = await attemptAsync(() => writeFile(resolvedFilePath, serialized, 'utf8'))
    if (writeError) {
      return err(`Failed to write config to ${resolvedFilePath}: ${String(writeError)}`)
    }

    return ok({ filePath: resolvedFilePath, format: resolvedFormat })
  }

  /**
   * Validate parsed config data and return a typed result.
   *
   * @private
   * @param data - The parsed config data.
   * @param filePath - Path to the config file.
   * @returns A ConfigOperationResult with the validated config.
   */
  function validateAndReturn(
    data: unknown,
    filePath: string
  ): ConfigOperationResult<ConfigLoadResult<output<TSchema>>> {
    const [validationError, validated] = validate({
      schema,
      params: data,
      createError: ({ message }) => new Error(`Invalid config in ${filePath}:\n${message}`),
    })
    if (validationError) {
      return err(validationError)
    }

    return ok({
      config: validated,
      filePath,
      format: getFormat(filePath),
    })
  }

  return Object.freeze({ find, load, write })
}

// ---------------------------------------------------------------------------

/**
 * Check whether c12 resolved to an actual config file on disk.
 *
 * c12 returns just the config name (e.g. `'myapp.config'`) when no file is
 * found, so an absolute path indicates a real resolution.
 *
 * @private
 * @param configFile - The `configFile` value from c12's result.
 * @returns `true` when the value is an absolute file path.
 */
function hasResolvedConfigFile(configFile: string | undefined): configFile is string {
  return configFile !== undefined && isAbsolute(configFile)
}

/**
 * Check whether a resolved config file has a data-only extension.
 *
 * Used to restrict the short-form config (`name.*`) to data formats,
 * preventing accidental resolution of `name.ts` or `name.js`.
 *
 * @private
 * @param configFile - The resolved config file path.
 * @returns `true` when the file has a data extension (JSON, JSONC, YAML, TOML).
 */
function isDataExtension(configFile: string): boolean {
  const ext = extname(configFile)
  return CONFIG_DATA_EXTENSIONS.has(ext)
}

/**
 * Extract a write-safe format from a file path extension.
 *
 * Falls back to 'jsonc' for non-writable formats (ts, js).
 *
 * @private
 * @param filePath - The file path to inspect.
 * @returns A write-compatible format.
 */
function getWriteFormat(filePath: string): 'json' | 'jsonc' | 'yaml' {
  const format = getFormat(filePath)
  return match(format)
    .with('json', () => 'json' as const)
    .with('jsonc', () => 'jsonc' as const)
    .with('yaml', () => 'yaml' as const)
    .otherwise(() => 'jsonc' as const)
}
