import { err, ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import { hasTag } from '@maltty/utils/tag'
import { match } from 'ts-pattern'
import type { Argv } from 'yargs'

import { INDEX_COMMAND_NAME } from '@/constants.js'
import type { CommandContext } from '@/context/types.js'
import type {
  ArgsDef,
  Command,
  CommandMap,
  Middleware,
  ScreenRenderFn,
  YargsArgDef,
} from '@/types/index.js'

import { registerCommandArgs } from './args/index.js'
import { isZodSchema, zodSchemaToPositionalMeta } from './args/zod.js'
import type { PositionalMeta } from './args/zod.js'
import { sortCommandEntries, validateCommandOrder } from './sort-commands.js'
import type { ResolvedRef } from './types.js'

/**
 * Type guard that checks whether a value is a Command object.
 *
 * @param value - The value to test.
 * @returns True when the value has `[TAG] === 'Command'`.
 */
export function isCommand(value: unknown): value is Command {
  return hasTag(value, 'Command')
}

/**
 * Register all commands from a CommandMap on a yargs instance.
 *
 * Iterates over the command map, filters for valid Command objects,
 * validates the order array, sorts entries, and recursively registers
 * each command (including subcommands) on the provided yargs Argv instance.
 *
 * @param options - Registration options including the command map, yargs instance, and resolution ref.
 */
export function registerCommands(options: RegisterCommandsOptions): void {
  const { instance, commands, resolved, parentPath, order, errorRef } = options
  const commandEntries = Object.entries(commands)
    .filter((pair): pair is [string, Command] => isCommand(pair[1]))
    .map(([key, entry]): readonly [string, Command] => [entry.name ?? key, entry])

  const [validationError] = validateLevel({ entries: commandEntries, order })
  if (validationError) {
    // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
    errorRef.error = validationError
    return
  }

  const sorted = sortCommandEntries({ entries: commandEntries, order })

  sorted.map(([name, entry]) =>
    registerSingleCommand({
      builder: instance,
      cmd: entry,
      errorRef,
      instance,
      name,
      parentPath,
      resolved,
    })
  )
}

export type { ResolvedCommand, ResolvedRef } from './types.js'

/**
 * Mutable ref holder for deferred error reporting during command registration.
 */
export interface ErrorRef {
  error: Error | undefined
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * The yargs sigil for a default command. Confined to this module — `default: true`
 * is the only surface callers ever touch.
 *
 * @private
 */
const YARGS_DEFAULT_COMMAND = '$0'

interface RegisterSingleCommandOptions {
  builder: Argv
  cmd: Command
  errorRef: ErrorRef
  instance: Argv
  name: string
  parentPath: string[]
  resolved: ResolvedRef
}

interface RegisterCommandsOptions {
  commands: CommandMap
  errorRef: ErrorRef
  instance: Argv
  order?: readonly string[]
  parentPath: string[]
  resolved: ResolvedRef
}

/**
 * Register a single resolved command (and its subcommands) with yargs.
 *
 * Sets up the yargs command handler, wires argument definitions, and
 * recursively registers any nested subcommands. On match, stores the
 * resolved handler and command path in the shared ref.
 *
 * @private
 * @param options - Command registration context.
 */
function registerSingleCommand(options: RegisterSingleCommandOptions): void {
  const { instance, name, cmd, resolved, parentPath, errorRef } = options
  const isDefault = cmd.default === true
  const isNamelessDefault = isDefault && name === INDEX_COMMAND_NAME
  const commandString = formatCommandString(
    resolveCommandName({ isNamelessDefault, name }),
    cmd.positionals
  )
  const commandSpec = formatCommandSpec({
    aliases: cmd.aliases,
    commandString,
    isNamedDefault: isDefault && !isNamelessDefault,
  })

  const builder = (yargsBuilder: Argv): Argv => {
    if (cmd.strict !== undefined) {
      yargsBuilder.strict(cmd.strict)
    }

    registerCommandArgs({
      builder: yargsBuilder,
      options: cmd.options,
      positionals: cmd.positionals,
    })

    if (cmd.commands) {
      const subCommands = Object.entries(cmd.commands)
        .filter((pair): pair is [string, Command] => isCommand(pair[1]))
        .map(([key, entry]): readonly [string, Command] => [entry.name ?? key, entry])

      const subOrder = cmd.help?.order

      const [subValidationError] = validateLevel({ entries: subCommands, order: subOrder })
      if (subValidationError) {
        // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
        errorRef.error = subValidationError
        return yargsBuilder
      }

      const sortedSubs = sortCommandEntries({ entries: subCommands, order: subOrder })

      sortedSubs.map(([subName, subEntry]) =>
        registerSingleCommand({
          builder: yargsBuilder,
          cmd: subEntry,
          errorRef,
          instance: yargsBuilder,
          name: subName,
          parentPath: resolveCommandPath({ isNamelessDefault, name, parentPath }),
          resolved,
        })
      )

      // Yargs counts a matched default subcommand toward `demandCommand(1)`.
      // A bare group invocation therefore needs no special case here.
      if (cmd.handler || cmd.render) {
        yargsBuilder.demandCommand(0)
      } else {
        yargsBuilder.demandCommand(1, 'You must specify a subcommand.')
      }
    }

    return yargsBuilder
  }

  const handler = (): void => {
    // Intentional mutation: yargs callback model requires mutable ref capture.
    // The `as` casts are accepted exceptions — generic handler/middleware types
    // Cannot be narrowed further inside the yargs callback boundary.
    resolved.ref = {
      commandPath: resolveCommandPath({ isNamelessDefault, name, parentPath }),
      handler: cmd.handler as ((ctx: CommandContext) => Promise<void> | void) | undefined,
      middleware: (cmd.middleware ?? []) as Middleware[],
      options: cmd.options,
      positionals: cmd.positionals,
      render: cmd.render as ScreenRenderFn | undefined,
    }
  }

  if (cmd.hidden === true) {
    instance.command(commandSpec, false, builder, handler, [], cmd.deprecated)
  } else {
    instance.command(commandSpec, cmd.description ?? '', builder, handler, [], cmd.deprecated)
  }
}

/**
 * Build a yargs command string with positional placeholders.
 *
 * Normalizes both Zod and yargs-native positional definitions to a common
 * intermediate representation, then formats each as `<name>` (required) or
 * `[name]` (optional).
 *
 * @private
 * @param name - The base command name.
 * @param positionals - Optional positional definitions (Zod schema or yargs-native record).
 * @returns The command string with positional placeholders appended.
 */
function formatCommandString(name: string, positionals: ArgsDef | undefined): string {
  if (!positionals) {
    return name
  }

  const meta = extractPositionalMeta(positionals)
  return match(meta.length)
    .with(0, () => name)
    .otherwise(() => [name, ...meta.map(formatPlaceholder)].join(' '))
}

/**
 * Normalize an `ArgsDef` into an ordered array of positional metadata.
 *
 * Handles both Zod schemas (via `zodSchemaToPositionalMeta`) and yargs-native
 * records (via `Object.entries` with `required` check).
 *
 * @private
 * @param positionals - The positional definitions.
 * @returns An ordered array of positional metadata.
 */
function extractPositionalMeta(positionals: ArgsDef): readonly PositionalMeta[] {
  if (isZodSchema(positionals)) {
    return zodSchemaToPositionalMeta(positionals)
  }
  return Object.entries(positionals).map(
    ([key, def]: [string, YargsArgDef]): PositionalMeta => ({
      isOptional: def.required !== true,
      name: key,
    })
  )
}

/**
 * Format a positional metadata entry as a yargs placeholder string.
 *
 * @private
 * @param meta - The positional metadata.
 * @returns `<name>` for required positionals, `[name]` for optional ones.
 */
function formatPlaceholder(meta: PositionalMeta): string {
  if (meta.isOptional) {
    return `[${meta.name}]`
  }
  return `<${meta.name}>`
}

/**
 * Resolve the name a command is registered under in yargs.
 *
 * A nameless default is registered under the yargs default sigil so it has no
 * invocable name of its own.
 *
 * @private
 * @param params - The resolved command name and whether it is a nameless default.
 * @returns The yargs command name.
 */
function resolveCommandName(params: {
  readonly isNamelessDefault: boolean
  readonly name: string
}): string {
  const { isNamelessDefault, name } = params
  if (isNamelessDefault) {
    return YARGS_DEFAULT_COMMAND
  }
  return name
}

/**
 * Build the command path reported as `ctx.meta.command`.
 *
 * A nameless default contributes no segment, so neither it nor its subcommands
 * expose an internal placeholder to user code.
 *
 * @private
 * @param params - The parent path, command name, and nameless-default flag.
 * @returns The command path segments.
 */
function resolveCommandPath(params: {
  readonly isNamelessDefault: boolean
  readonly name: string
  readonly parentPath: readonly string[]
}): string[] {
  const { isNamelessDefault, name, parentPath } = params
  if (isNamelessDefault) {
    return [...parentPath]
  }
  return [...parentPath, name]
}

/**
 * Build the first argument to `yargs.command()`.
 *
 * Returns a plain string when the command has no aliases and is not a named default,
 * otherwise a `[commandString, ...aliases]` array — both forms are accepted by yargs.
 * A named default command gains the yargs default sigil as a trailing alias so both
 * invocation forms dispatch to it. A nameless default is already registered under the
 * sigil as its command string and needs no extra alias.
 *
 * @private
 * @param params - The command string, its aliases, and whether it is a named default.
 * @returns A string or string array suitable for `yargs.command()`.
 */
function formatCommandSpec(params: {
  readonly aliases: readonly string[] | undefined
  readonly commandString: string
  readonly isNamedDefault: boolean
}): string | string[] {
  const { aliases, commandString, isNamedDefault } = params
  const allAliases = match(isNamedDefault)
    .with(true, () => [...(aliases ?? []), YARGS_DEFAULT_COMMAND])
    .otherwise(() => aliases ?? [])

  return match(allAliases.length)
    .with(0, () => commandString)
    .otherwise(() => [commandString, ...allAliases])
}

/**
 * Validate one level of command entries before they are registered.
 *
 * Runs every per-level check — single default, then declared order — so the root
 * level and each subcommand level share one validation path.
 *
 * @private
 * @param params - The `[name, Command]` pairs at one level and its optional order array.
 * @returns A Result tuple — `[null, void]` on success or `[Error, null]` on the first failure.
 */
function validateLevel(params: {
  readonly entries: readonly (readonly [string, Command])[]
  readonly order: readonly string[] | undefined
}): Result<void, Error> {
  const { entries, order } = params

  const [defaultError] = validateSingleDefault(entries)
  if (defaultError) {
    return [defaultError, null]
  }

  if (!order || order.length === 0) {
    return ok()
  }

  return validateCommandOrder({ commandNames: entries.map(([name]) => name), order })
}

/**
 * Validate that at most one command in a level is marked as the default.
 *
 * yargs silently keeps a single default command when several are registered, so
 * the conflict is surfaced as a startup error instead of a dispatch surprise.
 *
 * @private
 * @param entries - The `[name, Command]` pairs registered at one level.
 * @returns A Result tuple — `[null, void]` on success or `[Error, null]` on conflict.
 */
function validateSingleDefault(
  entries: readonly (readonly [string, Command])[]
): Result<void, Error> {
  const defaults = entries.filter(([, cmd]) => cmd.default === true)

  if (defaults.length > 1) {
    return err(
      `Multiple default commands: ${defaults.map(([name]) => `"${name}"`).join(', ')}. Only one command per level may be marked default.`
    )
  }

  return ok()
}
