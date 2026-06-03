import { resolve } from 'node:path'

import { createBundler, DEFAULT_ENTRY, normalizeCompileOptions } from '@maltty/bundler'
import type { BuildOutput, Bundler, CompileOutput, CompiledBinary } from '@maltty/bundler'
import type { CompileTarget, MalttyConfig } from '@maltty/config'
import { compileTargets, loadConfig } from '@maltty/config/utils'
import { command } from '@maltty/core'
import type { Command, CommandContext } from '@maltty/core'
import { process as proc } from '@maltty/utils/node'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { extractConfig } from '../lib/config-helpers.js'

const EngineSchema = z.enum(['node', 'tsx', 'binary'])

const compileTargetValues = compileTargets.map((entry) => entry.target) as [
  CompileTarget,
  ...CompileTarget[],
]
const TargetSchema = z.enum(compileTargetValues)

const options = z.object({
  engine: EngineSchema.default('node').describe(
    'Runtime engine: node (built), tsx (source), or binary (compiled)'
  ),
  inspect: z.boolean().optional().describe('Enable the Node.js inspector (--inspect)'),
  'inspect-brk': z
    .boolean()
    .optional()
    .describe('Enable the Node.js inspector and break before user code starts (--inspect-brk)'),
  'inspect-port': z.number().optional().describe('Set the inspector port'),
  'inspect-wait': z
    .boolean()
    .optional()
    .describe('Enable the Node.js inspector and wait for debugger to attach (--inspect-wait)'),
  target: z.string().optional().describe('Compile target for binary engine (e.g. darwin-arm64)'),
})

type RunArgs = z.infer<typeof options>

/**
 * Run the current maltty CLI project.
 *
 * Supports three engines:
 * - `node` (default) — builds first, then runs `node dist/index.js`
 * - `tsx` — runs the source entry file directly via `tsx`
 * - `binary` — builds and compiles, then executes the compiled binary
 *
 * All unknown flags are forwarded to the executed CLI. Supports
 * `--inspect`, `--inspect-brk`, `--inspect-wait`, and `--inspect-port`
 * for attaching a debugger (node and tsx engines only).
 */
const runCommand: Command = command({
  options,
  strict: false,
  description: 'Run the current maltty CLI project',
  handler: async (ctx: CommandContext<RunArgs>) => {
    const cwd = process.cwd()

    const [configError, configResult] = await loadConfig({ cwd })

    if (configError) {
      return ctx.fail(configError.message)
    }

    const config = extractConfig(configResult)

    if (ctx.args.engine === 'binary' && hasInspectFlag(ctx.args)) {
      return ctx.fail(
        'Inspector flags are not supported with the binary engine. Use --engine=node or --engine=tsx instead.'
      )
    }

    const passthroughArgs = extractPassthroughArgs()

    const exitCode = await match(ctx.args.engine)
      .with('node', () => runWithNode({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .with('tsx', () => runWithTsx({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .with('binary', () => runWithBinary({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .exhaustive()

    if (exitCode !== 0) {
      return ctx.fail(`Process exited with code ${exitCode}`)
    }
  },
})

export default runCommand

// ---------------------------------------------------------------------------

/**
 * Build the project and run the bundled entry file with `node`.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithNode(params: EngineParams): Promise<number> {
  const bundler = await createBundler({ config: params.config, cwd: params.cwd })
  const buildOutput = await buildProject({ bundler, ctx: params.ctx })
  const inspectFlags = buildInspectFlags(params.args)

  return spawnProcess({
    args: [...inspectFlags, buildOutput.entryFile, ...params.passthroughArgs],
    cmd: 'node',
    cwd: params.cwd,
  })
}

/**
 * Run the source entry file directly with `tsx`.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithTsx(params: EngineParams): Promise<number> {
  const entryFile = resolve(params.cwd, params.config.entry ?? DEFAULT_ENTRY)
  const inspectFlags = buildInspectFlags(params.args)

  return spawnProcess({
    args: [...inspectFlags, entryFile, ...params.passthroughArgs],
    cmd: 'tsx',
    cwd: params.cwd,
  })
}

/**
 * Build and compile the project, then execute the compiled binary.
 *
 * Requires compile targets to be configured in `maltty.config.ts` or
 * provided via `--target`. Resolves the current platform's binary
 * from the compile output.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithBinary(params: EngineParams): Promise<number> {
  const validatedTarget = validateTarget({ ctx: params.ctx, target: params.args.target })

  const configWithTarget = applyTargetOverride({
    config: params.config,
    target: validatedTarget,
  })

  if (!hasCompileTargets(configWithTarget)) {
    return params.ctx.fail(
      'No compile targets configured. Set targets in maltty.config.ts or use --target.'
    )
  }

  const bundler = await createBundler({ config: configWithTarget, cwd: params.cwd })

  await buildProject({ bundler, ctx: params.ctx })

  params.ctx.status.spinner.message('Compiling binary...')

  const compileOutput = await compileProject({ bundler, ctx: params.ctx })

  const binary = resolveBinary({
    compileOutput,
    ctx: params.ctx,
    target: params.args.target,
  })

  params.ctx.status.spinner.stop('Build complete')

  return spawnProcess({
    args: params.passthroughArgs,
    cmd: binary.path,
    cwd: params.cwd,
  })
}

/**
 * Parameters shared across all engine execution functions.
 *
 * @private
 */
interface EngineParams {
  readonly args: RunArgs
  readonly config: MalttyConfig
  readonly ctx: CommandContext<RunArgs>
  readonly cwd: string
  readonly passthroughArgs: readonly string[]
}

/**
 * Build the project using the bundler and return the build output.
 *
 * Starts a spinner, invokes the build, and fails the command on error.
 *
 * @private
 * @param params - The bundler instance and command context.
 * @returns The successful build output.
 */
async function buildProject(params: {
  readonly bundler: Bundler
  readonly ctx: CommandContext<RunArgs>
}): Promise<BuildOutput> {
  params.ctx.status.spinner.start('Building...')

  const [buildError, buildOutput] = await params.bundler.build()

  if (buildError) {
    params.ctx.status.spinner.stop('Build failed')
    return params.ctx.fail(buildError.message)
  }

  params.ctx.status.spinner.stop('Built')

  return buildOutput
}

/**
 * Compile the project into standalone binaries.
 *
 * @private
 * @param params - The bundler instance and command context.
 * @returns The successful compile output.
 */
async function compileProject(params: {
  readonly bundler: Bundler
  readonly ctx: CommandContext<RunArgs>
}): Promise<CompileOutput> {
  const [compileError, compileOutput] = await params.bundler.compile()

  if (compileError) {
    params.ctx.status.spinner.stop('Compile failed')
    return params.ctx.fail(compileError.message)
  }

  return compileOutput
}

/**
 * Resolve the binary to execute from compile output.
 *
 * When `--target` is provided, finds the matching binary. Otherwise
 * detects the host platform and architecture to find the correct binary.
 *
 * @private
 * @param params - The compile output, optional target, and command context.
 * @returns The resolved compiled binary.
 */
function resolveBinary(params: {
  readonly compileOutput: CompileOutput
  readonly ctx: CommandContext<RunArgs>
  readonly target: string | undefined
}): CompiledBinary {
  if (params.target) {
    const binary = params.compileOutput.binaries.find((b) => b.target === params.target)

    if (!binary) {
      return params.ctx.fail(`No binary found for target "${params.target}"`)
    }

    return binary
  }

  const hostTarget = resolveHostTarget()
  const candidates = resolveHostTargetCandidates(hostTarget)
  const binary = findFirstMatchingBinary(params.compileOutput.binaries, candidates)

  if (!binary) {
    return params.ctx.fail(`No binary found for target "${hostTarget}"`)
  }

  return binary
}

/**
 * Build an ordered list of candidate targets for the current host.
 *
 * On Linux x64, includes both the musl variant (`linux-x64-musl`) and the
 * glibc variant (`linux-x64`) so the correct binary is found on Alpine-like
 * hosts. The musl variant is preferred when available.
 *
 * @private
 * @param hostTarget - The base host target string (e.g. `linux-x64`).
 * @returns An ordered list of candidate target strings to try.
 */
function resolveHostTargetCandidates(hostTarget: string): readonly string[] {
  if (hostTarget === 'linux-x64') {
    return [`${hostTarget}-musl`, hostTarget]
  }

  return [hostTarget]
}

/**
 * Find the first binary matching any of the candidate targets.
 *
 * @private
 * @param binaries - The compiled binaries to search.
 * @param candidates - Ordered candidate target strings.
 * @returns The first matching binary, or `undefined`.
 */
function findFirstMatchingBinary(
  binaries: readonly CompiledBinary[],
  candidates: readonly string[]
): CompiledBinary | undefined {
  return candidates.reduce<CompiledBinary | undefined>(
    (found, candidate) => found ?? binaries.find((b) => b.target === candidate),
    undefined
  )
}

/**
 * Map from Node.js `process.platform` to compile target OS prefix.
 *
 * @private
 */
const PLATFORM_MAP: Readonly<Record<string, string>> = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows',
}

/**
 * Map from Node.js `process.arch` to compile target architecture suffix.
 *
 * @private
 */
const ARCH_MAP: Readonly<Record<string, string>> = {
  arm64: 'arm64',
  x64: 'x64',
}

/**
 * Detect the host platform and architecture, returning a compile target string.
 *
 * Combines `process.platform` and `process.arch` into a target like `darwin-arm64`.
 *
 * @private
 * @returns The compile target string for the current host.
 */
function resolveHostTarget(): string {
  const os = PLATFORM_MAP[process.platform] ?? process.platform
  const arch = ARCH_MAP[process.arch] ?? process.arch
  return `${os}-${arch}`
}

/**
 * Check whether a config has compilation enabled.
 *
 * Returns `true` for `compile: true` (boolean shorthand), for object configs
 * that omit `targets` (the bundler fills in defaults), and for object configs
 * with a non-empty `targets` array. Only returns `false` when compile is
 * `false`, `undefined`, or an object with an explicitly empty `targets` array.
 *
 * @private
 * @param config - The maltty config to check.
 * @returns `true` when compilation is enabled.
 */
function hasCompileTargets(config: MalttyConfig): boolean {
  if (config.compile === true) {
    return true
  }

  if (typeof config.compile !== 'object') {
    return false
  }

  if (config.compile.targets === undefined) {
    return true
  }

  return config.compile.targets.length > 0
}

/**
 * Validate a `--target` string against known compile targets.
 *
 * Returns the validated target when provided, or `undefined` when no target
 * was specified. Fails the command with a descriptive error for invalid values.
 *
 * @private
 * @param params - The target string and command context.
 * @returns The validated compile target, or `undefined`.
 */
function validateTarget(params: {
  readonly ctx: CommandContext<RunArgs>
  readonly target: string | undefined
}): CompileTarget | undefined {
  if (!params.target) {
    return undefined
  }

  const parsed = TargetSchema.safeParse(params.target)

  if (!parsed.success) {
    const validTargets = TargetSchema.options.join(', ')
    return params.ctx.fail(
      `Invalid compile target "${params.target}". Must be one of: ${validTargets}`
    )
  }

  return parsed.data
}

/**
 * Apply a `--target` CLI override to the config's compile targets.
 *
 * @private
 * @param params - The config and optional validated target override.
 * @returns A config with the target override applied.
 */
function applyTargetOverride(params: {
  readonly config: MalttyConfig
  readonly target: CompileTarget | undefined
}): MalttyConfig {
  if (!params.target) {
    return params.config
  }

  const existingCompile = normalizeCompileOptions(params.config.compile)

  return {
    ...params.config,
    compile: {
      ...existingCompile,
      targets: [params.target],
    },
  }
}

/**
 * Extract passthrough arguments by sequentially walking argv tokens
 * and skipping known `maltty run` flags and their values.
 *
 * Uses positional parsing: when a known flag that takes a value is
 * encountered (e.g. `--engine`), the next token is also skipped.
 * This avoids the fragile value-based matching that could accidentally
 * consume user CLI arguments that happen to match a known flag's value.
 *
 * @private
 * @returns An array of arguments to forward to the user's CLI.
 */
function extractPassthroughArgs(): readonly string[] {
  const argv = process.argv.slice(2)
  const runIndex = argv.indexOf('run')

  if (runIndex === -1) {
    return []
  }

  const afterRun = argv.slice(runIndex + 1)

  return collectPassthroughTokens(afterRun)
}

/**
 * Known boolean flags for the `maltty run` command (no value follows).
 *
 * @private
 */
const KNOWN_BOOLEAN_FLAGS: ReadonlySet<string> = new Set([
  '--inspect',
  '--inspect-brk',
  '--inspect-wait',
])

/**
 * Known value flags for the `maltty run` command (next token is consumed as value).
 *
 * @private
 */
const KNOWN_VALUE_FLAGS: ReadonlySet<string> = new Set(['--engine', '--inspect-port', '--target'])

/**
 * Walk an array of CLI tokens sequentially and collect only passthrough args.
 *
 * Skips known boolean flags, known value flags (and their following value token),
 * and `--flag=value` forms. All other tokens are collected as passthrough.
 *
 * @private
 * @param tokens - The CLI tokens after the `run` subcommand.
 * @returns The filtered passthrough arguments.
 */
function collectPassthroughTokens(tokens: readonly string[]): readonly string[] {
  return tokens.reduce<{ readonly result: readonly string[]; readonly skip: boolean }>(
    (acc, token) => {
      if (acc.skip) {
        return { result: acc.result, skip: false }
      }

      if (KNOWN_BOOLEAN_FLAGS.has(token)) {
        return { result: acc.result, skip: false }
      }

      if (KNOWN_VALUE_FLAGS.has(token)) {
        return { result: acc.result, skip: true }
      }

      if (isKnownEqualsSyntax(token)) {
        return { result: acc.result, skip: false }
      }

      return { result: [...acc.result, token], skip: false }
    },
    { result: [], skip: false }
  ).result
}

/**
 * Check whether a token uses `--flag=value` syntax for a known flag.
 *
 * @private
 * @param token - The CLI token to check.
 * @returns `true` when the token is a known flag in `--flag=value` form.
 */
function isKnownEqualsSyntax(token: string): boolean {
  const eqIndex = token.indexOf('=')
  if (eqIndex <= 0) {
    return false
  }

  const flagPart = token.slice(0, eqIndex)
  return KNOWN_BOOLEAN_FLAGS.has(flagPart) || KNOWN_VALUE_FLAGS.has(flagPart)
}

/**
 * Check whether any inspector flag is set, including `--inspect-port`.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns `true` when any inspector flag is enabled.
 */
function hasInspectFlag(args: RunArgs): boolean {
  return (
    args.inspect === true ||
    args['inspect-brk'] === true ||
    args['inspect-wait'] === true ||
    args['inspect-port'] !== undefined
  )
}

/**
 * Build inspector-related Node.js flags from parsed CLI args.
 *
 * Only one inspector mode is active at a time, with `inspect-brk` taking
 * precedence over `inspect-wait`, which takes precedence over `inspect`.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns An array of inspector flags.
 */
function buildInspectFlags(args: RunArgs): readonly string[] {
  const flag = resolveInspectMode(args)

  if (!flag) {
    return []
  }

  return [formatInspectFlag(flag, args['inspect-port'])]
}

/**
 * Determine which inspector mode to use based on parsed CLI args.
 *
 * When only `--inspect-port` is provided without an explicit mode,
 * defaults to `'inspect'` so the port is not silently ignored.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns The inspector flag name, or `undefined` if none is active.
 */
function resolveInspectMode(args: RunArgs): string | undefined {
  if (args['inspect-brk']) {
    return 'inspect-brk'
  }

  if (args['inspect-wait']) {
    return 'inspect-wait'
  }

  if (args.inspect) {
    return 'inspect'
  }

  if (args['inspect-port'] !== undefined) {
    return 'inspect'
  }

  return undefined
}

/**
 * Format an inspector flag with an optional port.
 *
 * @private
 * @param flag - The inspector flag name (e.g. 'inspect', 'inspect-brk').
 * @param port - Optional port number.
 * @returns The formatted flag string.
 */
function formatInspectFlag(flag: string, port: number | undefined): string {
  if (port !== undefined) {
    return `--${flag}=${port}`
  }

  return `--${flag}`
}

/**
 * Spawn a process with the given command and arguments, inheriting stdio.
 *
 * @private
 * @param params - The command, arguments, and working directory.
 * @returns The exit code of the spawned process.
 */
function spawnProcess(params: {
  readonly cmd: string
  readonly args: readonly string[]
  readonly cwd: string
}): Promise<number> {
  return proc.spawn(params)
}
