import type { ZodType, ZodTypeAny, infer as ZodInfer } from 'zod'

import type { ConfigFormat } from '@/lib/config/types.js'
import type { DeepReadonly } from '@/types/index.js'

// ---------------------------------------------------------------------------
// Config layer types
// ---------------------------------------------------------------------------

/**
 * Names for configuration resolution layers.
 */
export type ConfigLayerName = 'global' | 'project' | 'local'

/**
 * Metadata for a single resolved configuration layer.
 */
export interface ConfigLayer {
  /**
   * Which layer this config came from.
   */
  readonly name: ConfigLayerName
  /**
   * Absolute path to the resolved config file, or null if not found.
   */
  readonly filePath: string | null
  /**
   * The format of the resolved config file, or null if not found.
   */
  readonly format: ConfigFormat | null
  /**
   * The raw config data loaded from this layer (pre-merge, pre-validation).
   */
  readonly config: Readonly<Record<string, unknown>> | null
}

// ---------------------------------------------------------------------------
// Config load types
// ---------------------------------------------------------------------------

/**
 * Options for `ctx.config.load()`.
 *
 * Controls how config is resolved and how errors are handled.
 */
export interface ConfigLoadCallOptions {
  /**
   * Enable layered resolution (global > project > local merge).
   * When true, returns layer metadata alongside the merged config.
   */
  readonly layers?: boolean
  /**
   * Load a specific named layer only. Validates against the full schema.
   * Mutually exclusive with `layers`.
   */
  readonly layer?: ConfigLayerName
  /**
   * When true, calls `ctx.fail()` on load/validation errors instead of
   * returning null. Guarantees a non-null return value.
   */
  readonly exitOnError?: boolean
}

/**
 * Result returned by `ctx.config.load()`.
 *
 * @typeParam TConfig - The validated config type.
 */
export interface ConfigLoadCallResult<TConfig> {
  /**
   * Validated config data. Deeply readonly.
   */
  readonly config: TConfig
  /**
   * Per-layer metadata. Only present when `{ layers: true }` was passed.
   */
  readonly layers?: readonly ConfigLayer[]
}

/**
 * Config handle decorated onto `ctx.config` by the config middleware.
 *
 * Provides lazy, on-demand config loading with automatic caching.
 * The first successful `load()` call reads from disk; subsequent calls
 * return the cached result.
 *
 * @typeParam TConfig - The validated config type.
 */
export interface ConfigHandle<TConfig> {
  /**
   * Load and validate config from disk, or return the cached result.
   *
   * With `exitOnError: true`, calls `ctx.fail()` on error and guarantees
   * a non-null return. Without it, returns `null` on error.
   *
   * @param options - Controls resolution mode and error handling.
   * @returns The load result, or null on error (unless `exitOnError` is set).
   */
  readonly load: {
    (
      options: ConfigLoadCallOptions & { readonly exitOnError: true }
    ): Promise<ConfigLoadCallResult<TConfig>>
    (options?: ConfigLoadCallOptions): Promise<ConfigLoadCallResult<TConfig> | null>
  }
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/**
 * Options for the config middleware factory.
 *
 * @typeParam TSchema - Zod schema type used to validate the loaded config.
 */
export interface ConfigMiddlewareOptions<TSchema extends ZodTypeAny> {
  /**
   * Zod schema to validate the loaded config. Infers `ctx.config` type.
   */
  readonly schema: TSchema
  /**
   * Override the config file base name. Default: derived from `ctx.meta.name`.
   */
  readonly name?: string
  /**
   * Load config eagerly during the middleware pass (before the handler runs).
   * When true, the result is cached so subsequent `load()` calls are instant.
   * Default: false (lazy — config loaded on first `load()` call).
   */
  readonly eager?: boolean
  /**
   * Enable layered config resolution with global > project > local merging.
   * When true, config files are discovered at three locations and deep-merged
   * with local-wins precedence. Only applies when `eager` is true; for lazy
   * mode, pass `{ layers: true }` to `load()`. Default: false.
   */
  readonly layers?: boolean
  /**
   * Override layer directories. Only applies when layered resolution is used.
   */
  readonly dirs?: {
    /**
     * Override the global directory name. Default: `ctx.meta.dirs.global`.
     */
    readonly global?: string
    /**
     * Override the local directory name. Default: `ctx.meta.dirs.local`.
     */
    readonly local?: string
  }
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/**
 * Derive the config type from a Zod schema for use in module augmentation.
 *
 * Use this in a `declare module` block to type `ctx.config` via the registry:
 *
 * ```ts
 * import type { ConfigType } from 'maltty/config'
 *
 * declare module 'maltty/config' {
 *   interface ConfigRegistry extends ConfigType<typeof configSchema> {}
 * }
 * ```
 */
export type ConfigType<TSchema extends ZodType> = DeepReadonly<ZodInfer<TSchema>>

/**
 * Registry interface for typed config. Consumers augment this to narrow `ctx.config`.
 *
 * When empty (no augmentation), `ctx.config` defaults to `DeepReadonly<Record<string, unknown>>`.
 * When augmented, `ctx.config` resolves to the augmented type.
 */
export interface ConfigRegistry {}

/**
 * Resolved config type. Falls back to a generic record when no augmentation is provided.
 */
export type ResolvedConfig = keyof ConfigRegistry extends never
  ? DeepReadonly<Record<string, unknown>>
  : ConfigRegistry

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

declare module 'maltty' {
  interface CommandContext {
    /**
     * Config handle for lazy, on-demand config loading.
     * Added by the config middleware (`maltty/config`).
     *
     * Call `ctx.config.load()` to read and validate config from disk.
     * Results are cached after the first successful load.
     */
    readonly config: ConfigHandle<ResolvedConfig>
  }
}
