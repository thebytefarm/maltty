/**
 * All supported cross-compilation targets with human-readable labels.
 *
 * This is the single source of truth — the {@link CompileTarget} union type
 * and the Zod validation schema are both derived from this array.
 *
 * Targets marked `default: true` are compiled when no explicit targets are configured,
 * covering ~95% of developer environments.
 */
export const compileTargets = [
  { target: 'darwin-arm64', label: 'macOS Apple Silicon', default: true },
  { target: 'darwin-x64', label: 'macOS Intel', default: true },
  { target: 'linux-arm64', label: 'Linux ARM64', default: false },
  { target: 'linux-x64', label: 'Linux x64', default: true },
  { target: 'linux-x64-musl', label: 'Linux x64 (musl)', default: false },
  { target: 'windows-arm64', label: 'Windows ARM64', default: false },
  { target: 'windows-x64', label: 'Windows x64', default: true },
] as const

/**
 * Metadata for a single cross-compilation target.
 */
export type CompileTargetEntry = (typeof compileTargets)[number]

/**
 * Supported cross-compilation targets for `maltty compile`.
 */
export type CompileTarget = CompileTargetEntry['target']
