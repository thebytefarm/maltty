import { join } from 'node:path'

import { P, err, match, ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import { validate } from '@maltty/utils/validate'
import type { ZodTypeAny } from 'zod'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { createConfigClient } from '@/lib/config/client.js'
import type {
  ConfigLayerDirs,
  ConfigLayeredLoadResult,
  ConfigLoadResult,
} from '@/lib/config/types.js'
import { resolveGlobalPath } from '@/lib/project/paths.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type {
  ConfigHandle,
  ConfigLoadCallOptions,
  ConfigLoadCallResult,
  ConfigMiddlewareOptions,
} from './types.js'

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

interface NormalizeLoadResultParams {
  readonly result: ConfigLayeredLoadResult<unknown> | ConfigLoadResult<unknown> | null
  readonly schema: ZodTypeAny
}

interface ResolveLayerDirsParams<TSchema extends ZodTypeAny> {
  readonly ctx: CommandContext
  readonly options: ConfigMiddlewareOptions<TSchema>
}

interface ValidateConfigParams {
  readonly data: Record<string, unknown>
  readonly schema: ZodTypeAny
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
  const layerDirs = resolveLayerDirs({ ctx, options })
  const client = createConfigClient({
    cwd: layerDirs.project,
    dirs: { global: layerDirs.global, local: layerDirs.local },
    name: configName,
    schema,
  })

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
        client.load({ layer: opts.layer })
      )
      .with({ layers: true }, () => client.load({ layers: true }))
      .otherwise(() => client.load())

    if (resultError) {
      if (callOptions?.exitOnError === true) {
        ctx.fail(`Failed to load config: ${resultError.message}`)
      }
      return null
    }

    const [normalizeError, normalized] = normalizeLoadResult({ result, schema })
    if (normalizeError) {
      if (callOptions?.exitOnError === true) {
        ctx.fail(`Failed to load config: ${normalizeError.message}`)
      }
      return null
    }

    cache.set(cacheKey, normalized)
    return normalized
  }

  return { load } as ConfigHandle<unknown>
}

/**
 * Convert client load metadata into the middleware's context-facing result.
 *
 * @private
 * @param params - Client result and schema used to normalize it.
 * @returns The normalized middleware result.
 */
function normalizeLoadResult({
  result,
  schema,
}: NormalizeLoadResultParams): Result<ConfigLoadCallResult<unknown>> {
  return match(result)
    .with(null, () => validateConfig({ data: {}, schema }))
    .with({ layers: P.array() }, ({ config: loadedConfig, layers }) =>
      ok({ config: loadedConfig, layers })
    )
    .with({ filePath: P.string }, ({ config: loadedConfig }) => ok({ config: loadedConfig }))
    .exhaustive()
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
 * Resolve the middleware's context-derived directories for the standalone client.
 *
 * @private
 * @param params - Command context and middleware directory overrides.
 * @returns Explicit global, project, and local directories.
 */
function resolveLayerDirs<TSchema extends ZodTypeAny>({
  ctx,
  options,
}: ResolveLayerDirsParams<TSchema>): ConfigLayerDirs {
  const cwd = process.cwd()
  const globalDirName = options.dirs?.global ?? ctx.meta.dirs.global
  const localDirName = options.dirs?.local ?? ctx.meta.dirs.local
  return {
    global: resolveGlobalPath({ dirName: globalDirName }),
    project: cwd,
    local: join(cwd, localDirName),
  }
}

/**
 * Validate empty config against a schema to apply defaults.
 *
 * @private
 * @param params - Raw data and Zod schema used for validation.
 * @returns A Result tuple with the validated config.
 */
function validateConfig({
  data,
  schema,
}: ValidateConfigParams): Result<ConfigLoadCallResult<unknown>> {
  const [validationError, validated] = validate({
    createError: ({ message }) => new Error(`Invalid config:\n${message}`),
    params: data,
    schema,
  })

  if (validationError) {
    return err(validationError)
  }

  return ok({ config: validated as Record<string, unknown> })
}
