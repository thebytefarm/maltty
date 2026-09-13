import type { Result } from '@maltty/utils/fp'
import type { ZodTypeAny } from 'zod'

/**
 * Supported configuration file formats for reading.
 */
export type ConfigFormat = 'json' | 'json5' | 'jsonc' | 'js' | 'toml' | 'ts' | 'yaml'

/**
 * Supported configuration file formats for writing.
 */
export type ConfigWriteFormat = 'json' | 'jsonc' | 'yaml'

/**
 * Names for configuration resolution layers.
 */
export type ConfigLayerName = 'global' | 'project' | 'local'

/**
 * Explicit directories used for layered configuration resolution.
 */
export interface ConfigLayerDirs {
  readonly global: string
  readonly project: string
  readonly local: string
}

/**
 * Optional absolute-path overrides for derived global and local layer directories.
 */
export type ConfigLayerDirOverrides = Partial<Pick<ConfigLayerDirs, 'global' | 'local'>>

/**
 * Metadata for a resolved configuration layer.
 */
export interface ConfigLayer {
  readonly name: ConfigLayerName
  readonly filePath: string | null
  readonly format: ConfigFormat | null
  readonly config: Readonly<Record<string, unknown>> | null
}

/**
 * Options for creating a config client.
 */
export interface ConfigLoadOptions<TSchema extends ZodTypeAny> {
  readonly name: string
  readonly schema: TSchema
  readonly cwd?: string
  readonly dirs?: ConfigLayerDirOverrides
  readonly searchPaths?: readonly string[]
}

/**
 * Options for loading all configured layers.
 */
export interface ConfigLayeredLoadOptions {
  readonly layers: true
  readonly layer?: never
}

/**
 * Options for loading one configured layer.
 */
export interface ConfigNamedLayerLoadOptions {
  readonly layer: ConfigLayerName
  readonly layers?: never
}

/**
 * Resolution modes supported by the config client.
 */
export type ConfigClientLoadOptions = ConfigLayeredLoadOptions | ConfigNamedLayerLoadOptions

/**
 * Result of loading a config file: the parsed config, its path, and format.
 */
export interface ConfigLoadResult<TConfig> {
  readonly config: TConfig
  readonly filePath: string
  readonly format: ConfigFormat
}

/**
 * Result of loading and merging all configured layers.
 */
export interface ConfigLayeredLoadResult<TConfig> {
  readonly config: TConfig
  readonly layers: readonly ConfigLayer[]
}

/**
 * Options for writing a config file.
 */
export interface ConfigWriteOptions {
  readonly dir?: string
  readonly format?: ConfigWriteFormat
  readonly filePath?: string
}

/**
 * Result of writing a config file.
 */
export interface ConfigWriteResult {
  readonly filePath: string
  readonly format: ConfigWriteFormat
}

/**
 * Result type for config operations.
 */
export type ConfigOperationResult<TResult> = Result<TResult>

/**
 * Config client for loading, finding, and writing config files.
 */
export interface ConfigClient<TConfig> {
  readonly load: {
    (
      options: ConfigLayeredLoadOptions
    ): Promise<ConfigOperationResult<ConfigLayeredLoadResult<TConfig>>>
    (
      cwdOrOptions?: string | ConfigNamedLayerLoadOptions
    ): Promise<ConfigOperationResult<ConfigLoadResult<TConfig> | null>>
  }
  readonly find: (cwd?: string) => Promise<string | null>
  readonly write: (
    data: TConfig,
    options?: ConfigWriteOptions
  ) => Promise<ConfigOperationResult<ConfigWriteResult>>
}
