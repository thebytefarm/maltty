import { join } from 'node:path'

import { P, err, isPlainObject, match, merge, ok } from '@kidd-cli/utils/fp'
import type { Result } from '@kidd-cli/utils/fp'
import { validate } from '@kidd-cli/utils/validate'
import type { ZodTypeAny } from 'zod'
import { z } from 'zod'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { createConfigClient } from '@/lib/config/client.js'
import type { ConfigLoadResult } from '@/lib/config/types.js'
import { resolveGlobalPath } from '@/lib/project/paths.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type {
  ConfigHandle,
  ConfigLayer,
  ConfigLayerName,
  ConfigLoadCallOptions,
  ConfigLoadCallResult,
  ConfigMiddlewareOptions,
} from './types.js'

/**
 * Permissive schema used when loading raw layer data without per-layer validation.
 * Layers are validated only after merging.
 *
 * @private
 */
const RAW_SCHEMA = z.object({}).passthrough()

/**
 * Create a config middleware that decorates `ctx.config` with a lazy config handle.
 *
 * By default, config is loaded on-demand when `ctx.config.load()` is called.
 * With `eager: true`, config is loaded during the middleware pass and cached
 * so that subsequent `load()` calls return instantly.
 *
 * @param options - Config middleware options including schema, eager flag, and optional layers config.
 * @returns A Middleware that decorates ctx.config with a {@link ConfigHandle}.
 */
export function config<TSchema extends ZodTypeAny>(
  options: ConfigMiddlewareOptions<TSchema>
): Middleware {
  return middleware(async (ctx, next) => {
    const configName = options.name ?? ctx.meta.name
    const handle = createConfigHandle({ configName, ctx, options })

    decorateContext(ctx, 'config', handle)

    if (options.eager === true) {
      const loadOptions = match(options.layers)
        .with(true, (): ConfigLoadCallOptions => ({ exitOnError: true, layers: true }))
        .otherwise((): ConfigLoadCallOptions => ({ exitOnError: true }))
      await handle.load(loadOptions)
    }

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parameters for the config handle factory.
 *
 * @private
 */
interface ConfigHandleParams<TSchema extends ZodTypeAny> {
  readonly configName: string
  readonly ctx: CommandContext
  readonly options: ConfigMiddlewareOptions<TSchema>
}

/**
 * Create a closure-based config handle with lazy loading and caching.
 *
 * The handle reads config from disk on the first `load()` call and caches
 * the result. Subsequent calls return the cached value without re-reading.
 * Errors are not cached — a failed load can be retried.
 *
 * @private
 * @param params - The config name, context, and middleware options.
 * @returns A {@link ConfigHandle} instance.
 */
function createConfigHandle<TSchema extends ZodTypeAny>(
  params: ConfigHandleParams<TSchema>
): ConfigHandle<unknown> {
  const { configName, ctx, options } = params
  const { schema } = options

  /* eslint-disable -- closure-scoped mutable cache is intentional */
  const cache = new Map<string, ConfigLoadCallResult<unknown>>()
  /* eslint-enable */

  /**
   * Load config based on the provided options.
   *
   * Returns the config result or null on error. When `exitOnError` is true,
   * calls `ctx.fail()` on error instead of returning null. Results are cached
   * per resolution mode so that different call signatures don't collide.
   *
   * @private
   * @param callOptions - Resolution mode and error handling options.
   * @returns The load result, or null on error.
   */
  async function load(
    callOptions?: ConfigLoadCallOptions
  ): Promise<ConfigLoadCallResult<unknown> | null> {
    const cacheKey = resolveCacheKey(callOptions)
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const [resultError, result] = await match(callOptions)
      .with({ layer: P.union('global', 'project', 'local') }, (opts) =>
        loadNamedLayer(configName, schema, opts.layer, ctx, options)
      )
      .with({ layers: true }, () => loadLayered(configName, schema, ctx, options))
      .otherwise(() => loadSingle(configName, schema))

    if (resultError) {
      if (callOptions?.exitOnError === true) {
        ctx.fail(`Failed to load config: ${resultError.message}`)
      }
      return null
    }

    cache.set(cacheKey, result)
    return result
  }

  return { load } as ConfigHandle<unknown>
}

/**
 * Load config from a single directory (cwd) and validate.
 *
 * When no config file is found, validates an empty object against the schema
 * to apply defaults and catch missing required fields.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @returns A Result tuple with the load result.
 */
async function loadSingle(
  configName: string,
  schema: ZodTypeAny
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const client = createConfigClient({ name: configName, schema })
  const [loadError, result] = await client.load()

  if (loadError) {
    return err(loadError)
  }

  if (!result) {
    return validateConfig({}, schema)
  }

  return ok({ config: result.config as Record<string, unknown> })
}

/**
 * Load config from all three layer directories, merge, validate, and return.
 *
 * Layers are loaded without per-layer schema validation so that partial configs
 * (valid only after composition) can participate in the merge. The merged result
 * is validated once against the full schema.
 *
 * Per-layer load errors are captured in layer metadata rather than halting
 * the entire operation.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @param ctx - The command context.
 * @param options - Middleware options with optional dir overrides.
 * @returns A Result tuple with the merged config and layer metadata.
 */
async function loadLayered<TSchema extends ZodTypeAny>(
  configName: string,
  schema: TSchema,
  ctx: CommandContext,
  options: ConfigMiddlewareOptions<TSchema>
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const dirNames = resolveLayerDirNames(ctx, options)
  const layerDirs: readonly { readonly name: ConfigLayerName; readonly dir: string }[] = [
    { dir: resolveLayerDir('global', dirNames), name: 'global' },
    { dir: resolveLayerDir('project', dirNames), name: 'project' },
    { dir: resolveLayerDir('local', dirNames), name: 'local' },
  ]

  const rawClient = createConfigClient({ name: configName, schema: RAW_SCHEMA })
  const layerResults = await Promise.all(
    layerDirs.map((entry) => resolveLayer(rawClient.load, entry))
  )

  const foundConfigs = layerResults
    .filter((layer) => layer.config !== null)
    .map((layer) => layer.config as Record<string, unknown>)

  const dataToValidate = foundConfigs.reduce(
    (acc, layerConfig) => merge(acc, layerConfig),
    {} as Record<string, unknown>
  )

  const [validationError, validatedResult] = validateConfig(dataToValidate, schema, 'merged')

  if (validationError) {
    return err(validationError)
  }

  return ok({
    config: validatedResult.config as Record<string, unknown>,
    layers: layerResults,
  })
}

/**
 * Load config from a specific named layer directory and validate.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @param layerName - The layer to load.
 * @param ctx - The command context.
 * @param options - Middleware options with optional dir overrides.
 * @returns A Result tuple with the validated config from the named layer.
 */
async function loadNamedLayer<TSchema extends ZodTypeAny>(
  configName: string,
  schema: TSchema,
  layerName: ConfigLayerName,
  ctx: CommandContext,
  options: ConfigMiddlewareOptions<TSchema>
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const dirNames = resolveLayerDirNames(ctx, options)
  const dir = resolveLayerDir(layerName, dirNames)

  const client = createConfigClient({ name: configName, schema })
  const [loadError, result] = await client.load(dir)

  if (loadError) {
    return err(loadError)
  }

  if (!result) {
    return validateConfig({}, schema)
  }

  return ok({ config: result.config as Record<string, unknown> })
}

/**
 * Derive a stable cache key from load call options.
 *
 * Different resolution modes (single, layered, named layer) produce different
 * results, so each mode gets its own cache slot.
 *
 * @private
 * @param options - The load call options.
 * @returns A string key for the cache map.
 */
function resolveCacheKey(options?: ConfigLoadCallOptions): string {
  if (options?.layer) {
    return `layer:${options.layer}`
  }
  if (options?.layers === true) {
    return 'layers'
  }
  return 'single'
}

/**
 * Resolved layer directory names for global and local paths.
 *
 * @private
 */
interface LayerDirNames {
  readonly global: string
  readonly local: string
}

/**
 * Resolve global and local directory names from middleware options with context fallbacks.
 *
 * @private
 * @param ctx - The command context.
 * @param options - Middleware options with optional dir overrides.
 * @returns Resolved directory names.
 */
function resolveLayerDirNames<TSchema extends ZodTypeAny>(
  ctx: CommandContext,
  options: ConfigMiddlewareOptions<TSchema>
): LayerDirNames {
  return {
    global: options.dirs?.global ?? ctx.meta.dirs.global,
    local: options.dirs?.local ?? ctx.meta.dirs.local,
  }
}

/**
 * Resolve the absolute directory path for a given layer name.
 *
 * @private
 * @param layerName - The layer to resolve.
 * @param dirNames - Resolved directory names.
 * @returns Absolute path to the layer directory.
 */
function resolveLayerDir(layerName: ConfigLayerName, dirNames: LayerDirNames): string {
  return match(layerName)
    .with('global', () => resolveGlobalPath({ dirName: dirNames.global }))
    .with('project', () => process.cwd())
    .with('local', () => join(process.cwd(), dirNames.local))
    .exhaustive()
}

/**
 * Validate config data against a schema and return a Result tuple.
 *
 * Used for both empty-config defaults and merged-layer validation.
 *
 * @private
 * @param data - The raw data to validate.
 * @param schema - Zod schema for validation.
 * @param context - Label for the error message (e.g. 'merged').
 * @returns A Result tuple with the validated config.
 */
function validateConfig(
  data: Record<string, unknown>,
  schema: ZodTypeAny,
  context?: string
): Result<ConfigLoadCallResult<unknown>> {
  const prefix = match(context)
    .with(P.string, (ctx) => `Invalid ${ctx} config`)
    .otherwise(() => 'Invalid config')
  const [validationError, validated] = validate({
    createError: ({ message }) => new Error(`${prefix}:\n${message}`),
    params: data,
    schema,
  })

  if (validationError) {
    return err(validationError)
  }

  return ok({ config: validated as Record<string, unknown> })
}

/**
 * Load config from a single layer directory for use in layered resolution.
 *
 * Per-layer load errors are captured in the layer metadata rather than
 * halting the entire middleware — a broken layer still participates in
 * the merge with a null config.
 *
 * @private
 * @param load - The config client's load function.
 * @param entry - The layer name and directory.
 * @returns A ConfigLayer with the loaded data or nulls.
 */
async function resolveLayer(
  load: (cwd?: string) => Promise<readonly [Error | null, ConfigLoadResult<unknown> | null]>,
  entry: { readonly name: ConfigLayerName; readonly dir: string }
): Promise<ConfigLayer> {
  const [loadError, result] = await load(entry.dir)

  if (loadError || !result) {
    return { config: null, filePath: null, format: null, name: entry.name }
  }

  return {
    config: extractRawConfig(result.config),
    filePath: result.filePath,
    format: result.format,
    name: entry.name,
  }
}

/**
 * Coerce a raw config value to a record, or null when it's not a plain object.
 *
 * @private
 * @param value - The raw config value returned by the loader.
 * @returns The config as a record, or null.
 */
function extractRawConfig(value: unknown): Record<string, unknown> | null {
  if (isPlainObject(value)) {
    return value as Record<string, unknown>
  }
  return null
}
