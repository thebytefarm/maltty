import type { BuildOptions, CompileOptions, CompileTarget, MalttyConfig } from '@maltty/config'
import type { ResultAsync, Result } from '@maltty/utils/fp'

// Resolved config types (all fields required, paths absolute)

/**
 * Fully resolved build options with all defaults applied.
 */
export interface ResolvedBuildOptions {
  readonly target: string
  readonly minify: boolean
  readonly sourcemap: boolean
  readonly external: readonly string[]
  readonly clean: boolean
  readonly define: Readonly<Record<string, string>>
}

/**
 * Fully resolved compile options with all defaults applied.
 */
export interface ResolvedCompileOptions {
  readonly autoloadDotenv: boolean
  readonly targets: readonly CompileTarget[]
  readonly name: string
}

/**
 * Fully resolved bundler configuration with absolute paths and all defaults filled.
 */
export interface ResolvedBundlerConfig {
  readonly entry: string
  readonly commands: string
  readonly buildOutDir: string
  readonly compileOutDir: string
  readonly build: ResolvedBuildOptions
  readonly compile: ResolvedCompileOptions
  readonly include: readonly string[]
  readonly cwd: string
  readonly version: string | undefined
}

// Result aliases

/**
 * Synchronous result from a bundler operation.
 */
export type BundlerResult<T> = Result<T, Error>

/**
 * Asynchronous result from a bundler operation.
 */
export type AsyncBundlerResult<T> = ResultAsync<T, Error>

// Lifecycle types

/**
 * Bundler operation phase.
 */
export type Phase = 'build' | 'watch' | 'compile'

/**
 * Granular step within a phase.
 */
export type Step = 'target'

/**
 * Event fired at phase boundaries (start/finish).
 */
export interface PhaseEvent {
  readonly phase: Phase
}

/**
 * Event fired at step boundaries within a phase.
 */
export interface StepEvent {
  readonly phase: Phase
  readonly step: Step
  readonly meta: Readonly<Record<string, unknown>>
}

/**
 * Lifecycle hooks for bundler operations.
 */
export interface BundlerLifecycle {
  readonly onStart?: (event: PhaseEvent) => void | Promise<void>
  readonly onFinish?: (event: PhaseEvent) => void | Promise<void>
  readonly onStepStart?: (event: StepEvent) => void | Promise<void>
  readonly onStepFinish?: (event: StepEvent) => void | Promise<void>
}

// Factory types

/**
 * Parameters for creating a bundler instance.
 */
export interface CreateBundlerParams extends BundlerLifecycle {
  readonly config: MalttyConfig
  readonly cwd: string
}

/**
 * A bundler instance with build, watch, and compile methods.
 */
export interface Bundler {
  readonly build: (params?: BuildOverrides) => AsyncBundlerResult<BuildOutput>
  readonly watch: (params?: WatchOverrides) => AsyncBundlerResult<void>
  readonly compile: (params?: CompileOverrides) => AsyncBundlerResult<CompileOutput>
}

/**
 * Per-call overrides for build.
 */
export interface BuildOverrides extends BundlerLifecycle {
  readonly verbose?: boolean
}

/**
 * Per-call overrides for watch.
 */
export interface WatchOverrides extends BundlerLifecycle {
  readonly onSuccess?: () => void | Promise<void>
  readonly verbose?: boolean
}

/**
 * Per-call overrides for compile.
 */
export interface CompileOverrides extends BundlerLifecycle {
  readonly verbose?: boolean
}

// Output types

/**
 * Output of a successful build operation.
 */
export interface BuildOutput {
  readonly outDir: string
  readonly entryFile: string
  readonly version: string | undefined
  readonly define: Readonly<Record<string, string>>
}

/**
 * A single compiled binary for a specific target platform.
 */
export interface CompiledBinary {
  readonly target: CompileTarget
  readonly label: string
  readonly path: string
}

/**
 * Output of a successful compile operation.
 */
export interface CompileOutput {
  readonly binaries: readonly CompiledBinary[]
}

// Scan types (used by the autoload plugin)

/**
 * A single command file discovered during a directory scan.
 */
export interface ScannedFile {
  readonly name: string
  readonly filePath: string
}

/**
 * A subdirectory of commands discovered during a directory scan.
 */
export interface ScannedDir {
  readonly name: string
  readonly index?: string
  readonly files: readonly ScannedFile[]
  readonly dirs: readonly ScannedDir[]
}

/**
 * The result of scanning a commands directory tree.
 */
export interface ScanResult {
  readonly files: readonly ScannedFile[]
  readonly dirs: readonly ScannedDir[]
}

// Re-exports from @maltty/config for convenience

export type { BuildOptions, CompileOptions, CompileTarget, MalttyConfig }
