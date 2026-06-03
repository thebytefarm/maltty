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
 * Options for creating a config client.
 */
export interface ConfigLoadOptions<TSchema extends ZodTypeAny> {
  readonly name: string
  readonly schema: TSchema
  readonly searchPaths?: readonly string[]
}

/**
 * Result of loading a config file: the parsed config, its path, and format.
 */
export interface ConfigLoadResult<TConfig> {
  readonly config: TConfig
  readonly filePath: string
  readonly format: ConfigFormat
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
  readonly load: (cwd?: string) => Promise<ConfigOperationResult<ConfigLoadResult<TConfig> | null>>
  readonly find: (cwd?: string) => Promise<string | null>
  readonly write: (
    data: TConfig,
    options?: ConfigWriteOptions
  ) => Promise<ConfigOperationResult<ConfigWriteResult>>
}
