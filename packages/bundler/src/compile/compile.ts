import { join } from 'node:path'

import type { CompileTarget } from '@kidd-cli/config'
import { compileTargets } from '@kidd-cli/config/utils'
import { err, ok } from '@kidd-cli/utils/fp'
import type { Result, ResultAsync } from '@kidd-cli/utils/fp'
import { fs, process } from '@kidd-cli/utils/node'
import { match } from 'ts-pattern'

import type {
  AsyncBundlerResult,
  BundlerLifecycle,
  CompileOutput,
  CompiledBinary,
  ResolvedBundlerConfig,
} from '../types.js'
import { resolveBuildEntry } from '../utils/resolve-build-entry.js'

/**
 * Compile a kidd CLI tool into standalone binaries using `bun build --compile`.
 *
 * Expects the bundled entry to already exist in `outDir` (i.e., `build()` must
 * be run first). For each requested target (or defaults when none configured),
 * spawns `bun build --compile` to produce a self-contained binary.
 *
 * @param params - The resolved config, lifecycle hooks, and verbose flag.
 * @returns A result tuple with compile output on success or an Error on failure.
 */
export async function compile(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly lifecycle: BundlerLifecycle
  readonly verbose?: boolean
}): AsyncBundlerResult<CompileOutput> {
  const bunExists = await process.exists('bun')
  if (!bunExists) {
    return err(
      new Error(
        'bun is not installed or not found in PATH. Install it from https://bun.sh to use compile.'
      )
    )
  }

  const bundledEntry = await resolveBuildEntry(params.resolved.buildOutDir)

  if (!bundledEntry) {
    return err(
      new Error(`bundled entry not found in ${params.resolved.buildOutDir} — run build() first`)
    )
  }

  const targets: readonly CompileTarget[] = resolveTargets(params.resolved.compile.targets)
  const isMultiTarget = targets.length > 1

  const results = await compileTargetsSequentially({
    autoloadDotenv: params.resolved.compile.autoloadDotenv,
    bundledEntry,
    cwd: params.resolved.cwd,
    isMultiTarget,
    lifecycle: params.lifecycle,
    name: params.resolved.compile.name,
    outDir: params.resolved.compileOutDir,
    targets,
    verbose: params.verbose ?? false,
  })

  await cleanBunBuildArtifacts(params.resolved.cwd)

  const failedResult = results.find((r) => r[0] !== null)
  if (failedResult) {
    return err(failedResult[0])
  }

  const binaries: readonly CompiledBinary[] = results
    .filter((r): r is readonly [null, CompiledBinary] => r[1] !== null)
    .map(([, binary]) => binary)

  return ok({ binaries })
}

/**
 * Look up the human-readable label for a compile target.
 *
 * @param target - The compile target identifier.
 * @returns A descriptive label (e.g., "macOS Apple Silicon").
 */
export function resolveTargetLabel(target: CompileTarget): string {
  const entry = compileTargets.find((t) => t.target === target)
  if (entry) {
    return entry.label
  }

  return target
}

/**
 * Compile targets one at a time to avoid overwhelming bun with concurrent processes.
 *
 * @private
 * @param params - The targets and compilation parameters.
 * @returns The accumulated result tuples for each target.
 */
async function compileTargetsSequentially(params: {
  readonly autoloadDotenv: boolean
  readonly bundledEntry: string
  readonly cwd: string
  readonly isMultiTarget: boolean
  readonly lifecycle: BundlerLifecycle
  readonly name: string
  readonly outDir: string
  readonly targets: readonly CompileTarget[]
  readonly verbose: boolean
}): Promise<readonly Result<CompiledBinary>[]> {
  return params.targets.reduce<Promise<Result<CompiledBinary>[]>>(async (accPromise, target) => {
    const acc = await accPromise
    const label = resolveTargetLabel(target)
    const meta = { target, label }

    if (params.lifecycle.onStepStart) {
      await params.lifecycle.onStepStart({ phase: 'compile', step: 'target', meta })
    }

    const result = await compileSingleTarget({
      autoloadDotenv: params.autoloadDotenv,
      bundledEntry: params.bundledEntry,
      cwd: params.cwd,
      isMultiTarget: params.isMultiTarget,
      name: params.name,
      outDir: params.outDir,
      target,
      verbose: params.verbose,
    })

    if (params.lifecycle.onStepFinish) {
      await params.lifecycle.onStepFinish({ phase: 'compile', step: 'target', meta })
    }

    return [...acc, result]
  }, Promise.resolve([]))
}

/**
 * Compile a single target via `bun build --compile`.
 *
 * @private
 * @param params - Target compilation parameters.
 * @returns A result tuple with the compiled binary info or an error.
 */
async function compileSingleTarget(params: {
  readonly autoloadDotenv: boolean
  readonly bundledEntry: string
  readonly cwd: string
  readonly outDir: string
  readonly name: string
  readonly target: CompileTarget
  readonly isMultiTarget: boolean
  readonly verbose: boolean
}): ResultAsync<CompiledBinary> {
  const binaryName = resolveBinaryName(params.name, params.target, params.isMultiTarget)
  const outfile = join(params.outDir, binaryName)

  const [mapError, bunTarget] = mapCompileTarget(params.target)
  if (mapError) {
    return err(mapError)
  }

  const args = [
    'build',
    '--compile',
    ...resolveAutoloadFlags({ autoloadDotenv: params.autoloadDotenv }),
    params.bundledEntry,
    '--outfile',
    outfile,
    '--target',
    bunTarget,
  ]

  const [execError] = await process.exec({ cmd: 'bun', args, cwd: params.cwd })
  if (execError) {
    return err(
      new Error(formatCompileError(params.target, execError, params.verbose), { cause: execError })
    )
  }

  return ok({ label: resolveTargetLabel(params.target), path: outfile, target: params.target })
}

/**
 * Resolve the list of compile targets, falling back to the default set.
 *
 * @private
 * @param explicit - User-specified targets (may be empty).
 * @returns The targets to compile for.
 */
function resolveTargets(explicit: readonly CompileTarget[]): readonly CompileTarget[] {
  if (explicit.length > 0) {
    return explicit
  }

  return compileTargets.filter((t) => t.default).map((t) => t.target)
}

/**
 * Build the output binary name, appending the target suffix for multi-target
 * builds and the `.exe` extension for Windows targets.
 *
 * Windows targets must end with `.exe` because that is the file bun actually
 * produces (bun auto-appends `.exe` for any `bun-windows-*` target). Recording
 * the path without `.exe` would cause filesystem operations on the recorded
 * path to fail and would diverge from what is on disk.
 *
 * @private
 * @param name - Base binary name.
 * @param target - The compile target.
 * @param isMultiTarget - Whether multiple targets are being compiled.
 * @returns The resolved binary file name.
 */
function resolveBinaryName(name: string, target: CompileTarget, isMultiTarget: boolean): string {
  return appendBinaryExtension(buildBaseBinaryName(name, target, isMultiTarget), target)
}

/**
 * Build the base name without the platform extension.
 *
 * @private
 * @param name - Base binary name.
 * @param target - The compile target.
 * @param isMultiTarget - Whether multiple targets are being compiled.
 * @returns The base binary name with optional target suffix.
 */
function buildBaseBinaryName(name: string, target: CompileTarget, isMultiTarget: boolean): string {
  if (isMultiTarget) {
    return `${name}-${target}`
  }
  return name
}

/**
 * Append the `.exe` extension to Windows binary names.
 *
 * @private
 * @param base - The base binary name.
 * @param target - The compile target.
 * @returns The base name plus `.exe` for Windows targets, or the base unchanged.
 */
function appendBinaryExtension(base: string, target: CompileTarget): string {
  if (target.startsWith('windows-')) {
    return `${base}.exe`
  }
  return base
}

/**
 * Map a `CompileTarget` to Bun's `--target` string.
 *
 * Every supported kidd target must have an explicit mapping. An unrecognized
 * target is a fatal error — it means `compileTargets` was extended without
 * updating this function.
 *
 * @private
 * @param target - The kidd compile target.
 * @returns A result with the Bun target string, or an Error for unknown targets.
 */
function mapCompileTarget(target: CompileTarget): Result<string> {
  return match(target)
    .with('darwin-arm64', () => ok('bun-darwin-arm64'))
    .with('darwin-x64', () => ok('bun-darwin-x64'))
    .with('linux-arm64', () => ok('bun-linux-arm64'))
    .with('linux-x64', () => ok('bun-linux-x64'))
    .with('linux-x64-musl', () => ok('bun-linux-x64-musl'))
    .with('windows-arm64', () => ok('bun-windows-arm64'))
    .with('windows-x64', () => ok('bun-windows-x64'))
    .otherwise(() => err(new Error(`unknown compile target: ${target}`)))
}

/**
 * Build a descriptive error message for a failed compile target.
 *
 * @private
 * @param target - The compile target that failed.
 * @param execError - The error returned by execFile.
 * @param verbose - Whether to include stderr output in the message.
 * @returns A formatted error message.
 */
function formatCompileError(target: CompileTarget, execError: Error, verbose: boolean): string {
  const header = `bun build --compile failed for target ${target}`

  if (!verbose) {
    return header
  }

  const { stderr } = execError as { stderr?: string }
  if (stderr && stderr.trim().length > 0) {
    return `${header}\n${stderr.trim()}`
  }

  return header
}

/**
 * Build the CLI flags that control Bun's compile-time config autoloading.
 *
 * `bunfig.toml` loading is always disabled — kidd CLIs should never load
 * Bun runtime config. `.env` loading is controlled by the `autoloadDotenv`
 * option (disabled by default).
 *
 * @private
 * @param params - The autoload settings.
 * @returns An array of CLI flag strings.
 */
function resolveAutoloadFlags(params: { readonly autoloadDotenv: boolean }): readonly string[] {
  const candidates = [
    { enabled: false, flag: '--no-compile-autoload-bunfig' },
    { enabled: params.autoloadDotenv, flag: '--no-compile-autoload-dotenv' },
  ] as const

  return candidates.filter((c) => !c.enabled).map((c) => c.flag)
}

/**
 * Remove temporary `.bun-build` files that `bun build --compile` leaves behind.
 *
 * @private
 * @param cwd - The working directory to clean.
 */
async function cleanBunBuildArtifacts(cwd: string): Promise<void> {
  const [listError, entries] = await fs.list(cwd)
  if (listError) {
    return
  }

  const artifacts = entries
    .filter((name) => name.endsWith('.bun-build'))
    .map((name) => join(cwd, name))

  await Promise.allSettled(artifacts.map(fs.remove))
}
