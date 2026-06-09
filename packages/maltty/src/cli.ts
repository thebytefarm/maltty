import { resolve } from 'node:path'

import { updateSettings } from '@clack/prompts'
import { P, attemptAsync, err, isNil, isPlainObject, isString, match, ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import yargs from 'yargs'
import type { Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'
import { z } from 'zod'

import type { DisplayConfig } from '@/context/types.js'
import { exitOnError, registerCrashHandlers } from '@/lib/crash.js'
import type {
  CliOptions,
  CommandMap,
  CommandsConfig,
  DirsConfig,
  HelpOptions,
  ResolvedDirs,
} from '@/types/index.js'

import { autoload } from './autoload.js'
import { isCommandsConfig } from './command.js'
import { createRuntime, registerCommands } from './runtime/index.js'
import type { ErrorRef, ResolvedRef } from './runtime/index.js'

/**
 * Bootstrap and run the CLI application.
 *
 * Parses argv, resolves the matched command, loads config, runs the
 * middleware chain, and invokes the command handler.
 *
 * @param options - CLI configuration including name, version, commands, and middleware.
 */
export async function cli(options: CliOptions): Promise<void> {
  registerCrashHandlers(options.name)

  const [uncaughtError, result] = await attemptAsync(async () => {
    const [versionError, version] = resolveVersion(options.version)

    if (versionError) {
      return versionError
    }

    const rawTokens = hideBin(process.argv)
    const program = yargs(rawTokens)
      .scriptName(options.name)
      .version(version)
      .alias('version', 'v')
      .strict(options.strict !== false)
      .help()
      .alias('help', 'h')
      .option('cwd', {
        describe: 'Set the working directory',
        global: true,
        type: 'string',
      })

    if (options.description) {
      program.usage(options.description)
    }

    const footer = extractFooter(options.help)
    if (footer) {
      program.epilogue(footer)
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }

    const resolvedCmds = await resolveCommands(options.commands)

    if (resolvedCmds) {
      registerCommands({
        commands: resolvedCmds.commands,
        errorRef,
        instance: program,
        order: options.help?.order,
        parentPath: [],
        resolved,
      })

      if (errorRef.error) {
        return errorRef.error
      }
    }

    const argv: Record<string, unknown> = await program.parseAsync()

    applyCwd(argv)

    if (!resolved.ref) {
      showNoCommandHelp({ argv, commands: resolvedCmds, help: options.help, program })
      return undefined
    }

    const dirs = resolveDirs(options.name, options.dirs)

    applyDisplayGlobals(options.display)

    const normalizedArgv = [String(argv.$0), ...rawTokens]

    const [runtimeError, runtime] = await createRuntime({
      argv: normalizedArgv,
      dirs,
      display: options.display,
      log: options.log,
      middleware: options.middleware,
      name: options.name,
      prompts: options.prompts,
      status: options.status,
      version,
    })

    if (runtimeError) {
      return runtimeError
    }

    const [executeError] = await runtime.execute({
      commandPath: resolved.ref.commandPath,
      handler: resolved.ref.handler,
      middleware: resolved.ref.middleware,
      options: resolved.ref.options,
      positionals: resolved.ref.positionals,
      rawArgs: argv,
      render: resolved.ref.render,
    })

    return executeError
  })

  if (uncaughtError) {
    exitOnError(uncaughtError)
    return
  }

  if (result) {
    exitOnError(result)
  }
}

export default cli

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

const VERSION_ERROR = new Error(
  'No CLI version available. Either pass `version` to cli() or build with the maltty bundler.'
)

const VersionSchema = z.string().trim().min(1)

/**
 * Resolve the CLI version from an explicit value or the compile-time constant.
 *
 * Resolution order:
 * 1. Explicit version string passed to `cli()`
 * 2. `__MALTTY_VERSION__` injected by the maltty bundler at build time
 *
 * Returns an error when neither source provides a non-empty version.
 *
 * @private
 * @param explicit - The version string from `CliOptions.version`, if provided.
 * @returns A Result tuple with the resolved version string or an Error.
 */
function resolveVersion(explicit: string | undefined): Result<string> {
  if (explicit !== undefined) {
    const parsed = VersionSchema.safeParse(explicit)
    if (parsed.success) {
      return ok(parsed.data)
    }
    return err(VERSION_ERROR)
  }

  if (typeof __MALTTY_VERSION__ === 'string') {
    const parsed = VersionSchema.safeParse(__MALTTY_VERSION__)
    if (parsed.success) {
      return ok(parsed.data)
    }
  }

  return err(VERSION_ERROR)
}

/**
 * Resolved commands ready for registration.
 *
 * @private
 */
interface ResolvedCommands {
  readonly commands: CommandMap
}

/**
 * Resolve the commands option to a {@link ResolvedCommands}.
 *
 * Accepts a directory string (triggers autoload), a static CommandMap,
 * a Promise<CommandMap>, a structured {@link CommandsConfig},
 * or undefined (loads `maltty.config.ts` and autoloads from its `commands` field,
 * falling back to `'./commands'`).
 *
 * @private
 * @param commands - The commands option from CliOptions.
 * @returns Resolved commands with optional order, or undefined.
 */
async function resolveCommands(
  commands: string | CommandMap | Promise<CommandMap> | CommandsConfig | undefined
): Promise<ResolvedCommands | undefined> {
  return match(commands)
    .when(isString, async (dir) => ({ commands: await autoload({ dir }) }))
    .with(P.instanceOf(Promise), async (p) => ({ commands: await p }))
    .when(isCommandsConfig, (cfg) => resolveCommandsConfig(cfg))
    .when(isPlainObject, (cmds) => ({ commands: cmds }))
    .otherwise(() => resolveCommandsFromConfig())
}

/**
 * Resolve a structured {@link CommandsConfig} into a flat command map.
 *
 * When `path` is provided, autoloads from that directory. Otherwise uses the
 * inline `commands` map (resolved if it is a promise).
 *
 * @private
 * @param config - The structured commands configuration.
 * @returns Resolved commands.
 */
async function resolveCommandsConfig(config: CommandsConfig): Promise<ResolvedCommands> {
  const { path, commands: innerCommands } = config

  const commands = await match(innerCommands)
    .when(
      () => isString(path),
      async () => autoload({ dir: path as string })
    )
    .with(P.instanceOf(Promise), async (p) => p)
    .when(isPlainObject, (cmds) => cmds)
    .otherwise(() => ({}) as CommandMap)

  return { commands }
}

/**
 * Load `maltty.config.ts` and autoload commands from its `commands` field.
 *
 * Falls back to `'./commands'` when the config file is missing, fails to load,
 * or does not specify a `commands` field.
 *
 * @private
 * @returns A CommandMap autoloaded from the configured commands directory.
 */
async function resolveCommandsFromConfig(): Promise<ResolvedCommands> {
  const DEFAULT_COMMANDS_DIR = './commands'

  const { loadConfig } = await import('@maltty/config/utils')
  const [configError, configResult] = await loadConfig()
  if (configError || !configResult) {
    return { commands: await autoload({ dir: DEFAULT_COMMANDS_DIR }) }
  }

  const dir = configResult.config.commands ?? DEFAULT_COMMANDS_DIR
  return { commands: await autoload({ dir }) }
}

/**
 * Change the process working directory when `--cwd` is provided.
 *
 * Resolves the value to an absolute path and calls `process.chdir()` so
 * that all downstream `process.cwd()` calls reflect the override.
 *
 * @private
 * @param argv - The parsed argv record from yargs.
 */
function applyCwd(argv: Record<string, unknown>): void {
  if (isString(argv.cwd)) {
    process.chdir(resolve(argv.cwd))
  }
}

/**
 * Show help output when no command was matched.
 *
 * Prints the header (if configured) above the yargs help text. Skipped when
 * `--help` was explicitly passed, since yargs already handles that case.
 *
 * @private
 * @param params - The argv, commands, help options, and yargs program instance.
 */
function showNoCommandHelp({
  argv,
  commands,
  help,
  program,
}: {
  readonly argv: Record<string, unknown>
  readonly commands: ResolvedCommands | undefined
  readonly help: HelpOptions | undefined
  readonly program: Argv
}): void {
  if (!commands) {
    return
  }
  if (argv.help) {
    return
  }

  const header = extractHeader(help)
  if (header) {
    console.log(header)
    console.log()
  }
  program.showHelp('log')
}

/**
 * Extract the header string from help options.
 *
 * @private
 * @param help - The help options, possibly undefined.
 * @returns The header string or undefined.
 */
function extractHeader(help: HelpOptions | undefined): string | undefined {
  if (!help) {
    return undefined
  }
  return help.header
}

/**
 * Extract the footer string from help options.
 *
 * @private
 * @param help - The help options, possibly undefined.
 * @returns The footer string or undefined.
 */
function extractFooter(help: HelpOptions | undefined): string | undefined {
  if (!help) {
    return undefined
  }
  return help.footer
}

/**
 * Resolve directory config into a {@link ResolvedDirs} with defaults.
 *
 * Both `local` and `global` default to `.<name>` when not provided.
 *
 * @private
 * @param name - The CLI name used to derive defaults.
 * @param dirs - Optional user-provided directory overrides.
 * @returns Resolved dirs with both local and global guaranteed.
 */
function resolveDirs(name: string, dirs: DirsConfig | undefined): ResolvedDirs {
  const defaultDir = `.${name}`
  if (isNil(dirs)) {
    return { global: defaultDir, local: defaultDir }
  }
  return {
    global: match(dirs.global)
      .with(P.nullish, () => defaultDir)
      .when(isEmptyString, () => defaultDir)
      .otherwise((v) => v),
    local: match(dirs.local)
      .with(P.nullish, () => defaultDir)
      .when(isEmptyString, () => defaultDir)
      .otherwise((v) => v),
  }
}

/**
 * Check whether a value is an empty string (after trimming whitespace).
 *
 * @private
 * @param value - The value to check.
 * @returns True when the value is an empty or whitespace-only string.
 */
function isEmptyString(value: string): boolean {
  return value.trim().length === 0
}

/**
 * Apply display config settings that can only be set globally via clack's `updateSettings()`.
 *
 * Only `aliases` and `messages` require global application. All other
 * display config values (including `guide`) are injected per-call by the
 * context factories.
 *
 * @private
 * @param display - The display config from CliOptions, if any.
 */
function applyDisplayGlobals(display: DisplayConfig | undefined): void {
  if (display === undefined) {
    return
  }

  const hasAliases = display.aliases !== undefined
  const hasMessages = display.messages !== undefined

  if (!hasAliases && !hasMessages) {
    return
  }

  updateSettings({
    aliases: display.aliases,
    messages: display.messages,
  })
}
