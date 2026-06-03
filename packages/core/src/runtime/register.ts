import { hasTag } from '@maltty/utils/tag'
import { match } from 'ts-pattern'
import type { Argv } from 'yargs'

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
import type { ResolvedCommand, ResolvedRef } from './types.js'

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

  if (order && order.length > 0) {
    const commandNames = commandEntries.map(([name]) => name)
    const [validationError] = validateCommandOrder({ commandNames, order })
    if (validationError && errorRef) {
      // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
      errorRef.error = validationError
      return
    }
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

interface RegisterSingleCommandOptions {
  builder: Argv
  cmd: Command
  errorRef?: ErrorRef
  instance: Argv
  name: string
  parentPath: string[]
  resolved: ResolvedRef
}

interface RegisterCommandsOptions {
  commands: CommandMap
  errorRef?: ErrorRef
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
  const commandString = formatCommandString(name, cmd.positionals)
  const commandSpec = formatCommandSpec(commandString, cmd.aliases)

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

      if (subOrder && subOrder.length > 0) {
        const subNames = subCommands.map(([n]) => n)
        const [validationError] = validateCommandOrder({
          commandNames: subNames,
          order: subOrder,
        })
        if (validationError && errorRef) {
          // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
          errorRef.error = validationError
          return yargsBuilder
        }
      }

      const sortedSubs = sortCommandEntries({ entries: subCommands, order: subOrder })

      sortedSubs.map(([subName, subEntry]) =>
        registerSingleCommand({
          builder: yargsBuilder,
          cmd: subEntry,
          errorRef,
          instance: yargsBuilder,
          name: subName,
          parentPath: [...parentPath, name],
          resolved,
        })
      )

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
      commandPath: [...parentPath, name],
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
 * Build the first argument to `yargs.command()`.
 *
 * Returns a plain string when there are no aliases, or a `[commandString, ...aliases]`
 * array when aliases are present — both forms are accepted by yargs.
 *
 * @private
 * @param commandString - The primary command string (may include positional placeholders).
 * @param aliases - Optional alternative names for the command.
 * @returns A string or string array suitable for `yargs.command()`.
 */
function formatCommandSpec(
  commandString: string,
  aliases: readonly string[] | undefined
): string | string[] {
  return match(aliases)
    .with(undefined, () => commandString)
    .otherwise((a) =>
      match(a.length)
        .with(0, () => commandString)
        .otherwise(() => [commandString, ...a])
    )
}
