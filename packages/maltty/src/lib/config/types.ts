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
  /**
   * Directory containing the global configuration layer.
   */
  readonly global: string
  /**
   * Directory containing the project configuration layer.
   */
  readonly project: string
  /**
   * Directory containing the local configuration layer.
   */
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
  /**
   * Which layer this config came from.
   */
  readonly name: ConfigLayerName
  /**
   * Absolute path to the resolved config file, or null when not found.
   */
  readonly filePath: string | null
  /**
   * Format of the resolved config file, or null when not found.
   */
  readonly format: ConfigFormat | null
  /**
   * Raw config data from this layer before merging and validation.
   */
  readonly config: Readonly<Record<string, unknown>> | null
}

/**
 * Options for creating a config client.
 */
export interface ConfigLoadOptions<TSchema extends ZodTypeAny> {
  /**
   * Base name used to discover configuration files.
   */
  readonly name: string
  /**
   * Zod schema used to validate loaded configuration.
   */
  readonly schema: TSchema
  /**
   * Directory from which project configuration resolution starts.
   */
  readonly cwd?: string
  /**
   * Overrides for the derived global and local layer directories.
   */
  readonly dirs?: ConfigLayerDirOverrides
  /**
   * Additional directories searched for project configuration.
   */
  readonly searchPaths?: readonly string[]
}

/**
 * Options for loading all configured layers.
 */
export interface ConfigLayeredLoadOptions {
  /**
   * Enable layered resolution (global > project > local merge).
   * Returns layer metadata alongside the merged config.
   */
  readonly layers: true
  /**
   * Named-layer selection is unavailable when loading all layers.
   */
  readonly layer?: never
}

/**
 * Options for loading one configured layer.
 */
export interface ConfigNamedLayerLoadOptions {
  /**
   * Load a specific named layer only. Validates against the full schema.
   * Mutually exclusive with `layers`.
   */
  readonly layer: ConfigLayerName
  /**
   * All-layer resolution is unavailable when loading a named layer.
   */
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
  /**
   * Validated configuration data.
   */
  readonly config: TConfig
  /**
   * Absolute path to the loaded configuration file.
   */
  readonly filePath: string
  /**
   * Format of the loaded configuration file.
   */
  readonly format: ConfigFormat
}

/**
 * Result of loading and merging all configured layers.
 */
export interface ConfigLayeredLoadResult<TConfig> {
  /**
   * Validated configuration produced by merging all layers.
   */
  readonly config: TConfig
  /**
   * Metadata and raw data for each resolved layer.
   */
  readonly layers: readonly ConfigLayer[]
}

/**
 * Options for writing a config file.
 */
export interface ConfigWriteOptions {
  /**
   * Directory in which to write the configuration file.
   */
  readonly dir?: string
  /**
   * Output format. Defaults to JSON.
   */
  readonly format?: ConfigWriteFormat
  /**
   * Explicit output path, overriding the derived directory and file name.
   */
  readonly filePath?: string
}

/**
 * Result of writing a config file.
 */
export interface ConfigWriteResult {
  /**
   * Absolute path to the written configuration file.
   */
  readonly filePath: string
  /**
   * Format used to serialize the configuration file.
   */
  readonly format: ConfigWriteFormat
}

/**
 * Result type for config operations.
 */
export type ConfigOperationResult<TResult> = Result<TResult>

type ConfigLoadOperationResult<TConfig> = ConfigOperationResult<ConfigLoadResult<TConfig> | null>
type ConfigLayeredLoadOperationResult<TConfig> = ConfigOperationResult<
  ConfigLayeredLoadResult<TConfig>
>

/**
 * Config client for loading, finding, and writing config files.
 */
export interface ConfigClient<TConfig> {
  /**
   * Load and validate config using project, named-layer, or layered resolution.
   *
   * @param cwdOrOptions - Starting directory or explicit resolution mode.
   * @returns The resolved config result or an expected load error.
   */
  readonly load: {
    (cwdOrOptions: ConfigLayeredLoadOptions): Promise<ConfigLayeredLoadOperationResult<TConfig>>
    (
      cwdOrOptions?: string | ConfigNamedLayerLoadOptions
    ): Promise<ConfigLoadOperationResult<TConfig>>
  }
  /**
   * Find the nearest project configuration file.
   *
   * @param cwd - Directory from which resolution starts.
   * @returns The absolute config path, or null when no file exists.
   */
  readonly find: (cwd?: string) => Promise<string | null>
  /**
   * Validate and write configuration data.
   *
   * @param data - Configuration data to validate and serialize.
   * @param options - Output path and format overrides.
   * @returns The written file metadata or an expected write error.
   */
  readonly write: (
    data: TConfig,
    options?: ConfigWriteOptions
  ) => Promise<ConfigOperationResult<ConfigWriteResult>>
}
