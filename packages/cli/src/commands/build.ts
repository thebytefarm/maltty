import { relative } from 'node:path'

import { createBundler, normalizeCompileOptions } from '@maltty/bundler'
import type { CompiledBinary } from '@maltty/bundler'
import type { CompileTarget, MalttyConfig } from '@maltty/config'
import { loadConfig } from '@maltty/config/utils'
import { command } from 'maltty'
import type { Command, CommandContext } from 'maltty'
import pc from 'picocolors'
import { z } from 'zod'

import { extractConfig } from '../lib/config-helpers.js'

const options = z.object({
  clean: z.boolean().optional().describe('Clean build artifacts before bundling (default: true)'),
  compile: z.boolean().optional().describe('Compile to standalone binaries after bundling'),
  targets: z.array(z.string()).optional().describe('Compile targets (implies --compile)'),
  verbose: z
    .boolean()
    .optional()
    .describe('Show detailed error output on bundle or compile failure'),
})

type BuildArgs = z.infer<typeof options>

/**
 * Build a maltty CLI project for production.
 *
 * Loads the project's `maltty.config.ts`, invokes the bundler, and reports
 * the output entry file and directory on success. When `--compile` or
 * `--targets` is provided (or `compile` is set in config), also compiles
 * to standalone binaries via Bun.
 */
const buildCommand: Command = command({
  options,
  description: 'Build a maltty CLI project for production',
  handler: async (ctx: CommandContext<BuildArgs>) => {
    const cwd = process.cwd()
    const startTime = Date.now()

    const [, configResult] = await loadConfig({ cwd })
    const config = mergeCleanOption({ config: extractConfig(configResult), clean: ctx.args.clean })

    const shouldCompile = resolveCompileIntent({
      compileFlag: ctx.args.compile,
      configCompile: config.compile,
      targets: ctx.args.targets,
    })

    const mergedConfig = resolveMergedConfig({
      config,
      shouldCompile,
      targets: ctx.args.targets,
    })

    const bundler = await createBundler({
      config: mergedConfig,
      cwd,
      onStepStart: ({ meta }) =>
        ctx.status.spinner.message(`Compiling ${String(meta.label ?? 'target')}...`),
      onStepFinish: ({ meta }) =>
        ctx.status.spinner.message(`Compiled ${String(meta.label ?? 'target')}`),
    })

    ctx.status.spinner.start('Bundling...')

    const [buildError, buildOutput] = await bundler.build({ verbose: ctx.args.verbose })

    if (buildError) {
      ctx.status.spinner.stop('Bundle failed')
      return ctx.fail(buildError.message)
    }

    if (!shouldCompile) {
      ctx.status.spinner.stop('Build complete')
      ctx.log.note(
        formatBuildNote({
          cwd,
          define: buildOutput.define,
          entryFile: buildOutput.entryFile,
          outDir: buildOutput.outDir,
          version: buildOutput.version,
        }),
        'Bundle'
      )
      ctx.log.outro(formatOutroSummary({ binaries: 0, duration: Date.now() - startTime }))
      return
    }

    ctx.status.spinner.message('Bundled, compiling binaries...')

    const [compileError, compileOutput] = await bundler.compile({
      verbose: ctx.args.verbose,
    })

    if (compileError) {
      ctx.status.spinner.stop('Compile failed')
      return ctx.fail(compileError.message)
    }

    ctx.status.spinner.stop('Build complete')
    ctx.log.note(
      formatBuildNote({
        cwd,
        define: buildOutput.define,
        entryFile: buildOutput.entryFile,
        outDir: buildOutput.outDir,
        version: buildOutput.version,
      }),
      'Bundle'
    )
    ctx.log.note(formatBinariesNote({ binaries: compileOutput.binaries, cwd }), 'Binaries')
    ctx.log.outro(
      formatOutroSummary({
        binaries: compileOutput.binaries.length,
        duration: Date.now() - startTime,
      })
    )
  },
})

export default buildCommand

// ---------------------------------------------------------------------------

/**
 * Apply compile-target overrides to the config when compilation will run.
 *
 * @private
 * @param params - The base config, compile decision, and CLI target overrides.
 * @returns The config to hand to the bundler.
 */
function resolveMergedConfig(params: {
  readonly config: MalttyConfig
  readonly shouldCompile: boolean
  readonly targets: readonly string[] | undefined
}): MalttyConfig {
  if (params.shouldCompile) {
    return mergeCompileTargets({ config: params.config, targets: params.targets })
  }
  return params.config
}

/**
 * Determine whether compilation should run based on CLI flags and config.
 *
 * Resolution order:
 * 1. `--targets` provided → compile (implied)
 * 2. `--compile` flag → use its boolean value
 * 3. Fall back to config `compile` field (truthy = compile)
 *
 * @private
 * @param params - The CLI flags and config compile field.
 * @returns Whether to run the compile step.
 */
function resolveCompileIntent(params: {
  readonly targets: readonly string[] | undefined
  readonly compileFlag: boolean | undefined
  readonly configCompile: boolean | MalttyConfig['compile']
}): boolean {
  if (params.targets && params.targets.length > 0) {
    return true
  }

  if (params.compileFlag !== undefined) {
    return params.compileFlag
  }

  if (params.configCompile === true) {
    return true
  }

  if (typeof params.configCompile === 'object') {
    return true
  }

  return false
}

/**
 * Merge CLI `--targets` into the config's compile options.
 *
 * @private
 * @param params - The config and optional CLI targets.
 * @returns A config with compile targets merged in.
 */
function mergeCompileTargets(params: {
  readonly config: MalttyConfig
  readonly targets: readonly string[] | undefined
}): MalttyConfig {
  if (!params.targets || params.targets.length === 0) {
    return params.config
  }

  const existingCompile = normalizeCompileOptions(params.config.compile)

  return {
    ...params.config,
    compile: {
      ...existingCompile,
      targets: params.targets as CompileTarget[],
    },
  }
}

/**
 * Merge the CLI `--clean` / `--no-clean` flag into the loaded config.
 *
 * @private
 * @param params - The loaded config and optional CLI clean flag.
 * @returns A config with the clean option merged in.
 */
function mergeCleanOption(params: {
  readonly config: MalttyConfig
  readonly clean: boolean | undefined
}): MalttyConfig {
  if (params.clean === undefined) {
    return params.config
  }

  return {
    ...params.config,
    build: {
      ...params.config.build,
      clean: params.clean,
    },
  }
}

/**
 * Format bundle output into a multi-line string for display.
 *
 * @private
 * @param params - The build output paths and working directory.
 * @returns A formatted string with entry and output directory.
 */
function formatBuildNote(params: {
  readonly entryFile: string
  readonly outDir: string
  readonly cwd: string
  readonly version: string | undefined
  readonly define: Readonly<Record<string, string>>
}): string {
  return [
    `entry    ${relative(params.cwd, params.entryFile)}`,
    `output   ${relative(params.cwd, params.outDir)}`,
    ...formatVersionLine(params.version),
    ...formatDefineLines(params.define),
  ].join('\n')
}

/**
 * Format a version line for the build note, if a version is available.
 *
 * @private
 * @param version - The version string, or undefined.
 * @returns A single-element array with the formatted line, or an empty array.
 */
function formatVersionLine(version: string | undefined): string[] {
  if (!version) {
    return []
  }

  return [`version  ${version}`]
}

/**
 * Format define constants into display lines.
 *
 * Omits `__MALTTY_VERSION__` (already shown as `version`) and returns
 * remaining entries as `define   key = value` lines.
 *
 * @private
 * @param define - The resolved define map.
 * @returns An array of formatted lines (empty when no user-defined constants).
 */
/**
 * Format the outro summary line with build stats.
 *
 * @private
 * @param params - Build stats for the summary.
 * @returns A formatted inline summary string.
 */
function formatOutroSummary(params: {
  readonly binaries: number
  readonly duration: number
}): string {
  const stats = [
    ...formatBinariesSegment(params.binaries),
    `finished in ${formatDuration(params.duration)}`,
  ]

  return stats.join(pc.gray(' · '))
}

/**
 * Build the optional "binaries compiled" segment of the outro summary.
 *
 * @private
 * @param count - The number of compiled binaries.
 * @returns A single-element array describing the count, or an empty array.
 */
function formatBinariesSegment(count: number): readonly string[] {
  if (count > 0) {
    return [`${count} binaries compiled`]
  }
  return []
}

/**
 * Format a millisecond duration into a human-readable string.
 *
 * @private
 * @param ms - Duration in milliseconds.
 * @returns A formatted duration string (e.g. "1.2s", "350ms").
 */
function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${ms}ms`
}

function formatDefineLines(define: Readonly<Record<string, string>>): string[] {
  return Object.entries(define).map(([key, value]) => `build_var ${key} = ${value}`)
}

/**
 * Format compiled binaries into an aligned, multi-line string for display.
 *
 * @private
 * @param params - The binaries and working directory for relative path resolution.
 * @returns A formatted string with one line per binary.
 */
function formatBinariesNote(params: {
  readonly binaries: readonly CompiledBinary[]
  readonly cwd: string
}): string {
  const maxLen = Math.max(...params.binaries.map((b) => b.label.length))

  return params.binaries
    .map((binary) => `${binary.label.padEnd(maxLen)}  ${relative(params.cwd, binary.path)}`)
    .join('\n')
}
