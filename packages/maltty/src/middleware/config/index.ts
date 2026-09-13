export { config } from './config.js'
export { defineConfig } from '@maltty/config'
export { createConfigClient } from '@/lib/config/client.js'
export type {
  ConfigClient,
  ConfigClientLoadOptions,
  ConfigFormat,
  ConfigLayer,
  ConfigLayerDirOverrides,
  ConfigLayerDirs,
  ConfigLayeredLoadOptions,
  ConfigLayeredLoadResult,
  ConfigLayerName,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigNamedLayerLoadOptions,
  ConfigOperationResult,
  ConfigWriteFormat,
  ConfigWriteOptions,
  ConfigWriteResult,
} from '@/lib/config/types.js'
export type {
  ConfigHandle,
  ConfigLoadCallOptions,
  ConfigLoadCallResult,
  ConfigMiddlewareOptions,
  ConfigRegistry,
  ConfigType,
  ResolvedConfig,
} from './types.js'
