export * as fs from './fs.js'
export * as path from './path.js'
export {
  ARCH_MAP,
  PLATFORM_MAP,
  binExt,
  binName,
  getPlatformDir,
  getPlatformTriple,
  isLinux,
  isMacOS,
  isWindows,
} from './platform.js'
export type { CompileTarget } from './platform.js'
export * as process from './process.js'
