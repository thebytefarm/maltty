export { config } from './config.js'
export { defineConfig } from '@maltty/config'
export { createConfigClient } from '@/lib/config/client.js'
export type {
  ConfigClient,
  ConfigFormat,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigOperationResult,
  ConfigWriteFormat,
  ConfigWriteOptions,
  ConfigWriteResult,
} from '@/lib/config/types.js'
export type {
  ConfigHandle,
  ConfigLayer,
  ConfigLayerName,
  ConfigLoadCallOptions,
  ConfigLoadCallResult,
  ConfigMiddlewareOptions,
  ConfigRegistry,
  ConfigType,
  ResolvedConfig,
} from './types.js'
