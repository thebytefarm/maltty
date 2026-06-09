import type { Tagged } from '@maltty/utils/tag'
import type { z } from 'zod'

import type { CommandContext } from '../context/types.js'
import type { HelpOptions } from './cli.js'
import type { InferVariables, Middleware, MiddlewareEnv } from './middleware.js'
import type { AnyRecord, Resolvable } from './utility.js'

// ---------------------------------------------------------------------------
// Command types
// ---------------------------------------------------------------------------

/**
 * Yargs-native arg format -- accepted as an alternative to zod.
 * Converted to a zod schema internally before parsing.
 */
export interface YargsArgDef {
  readonly type: 'string' | 'number' | 'boolean' | 'array'
  readonly description?: string
  readonly required?: boolean
  readonly default?: unknown
  readonly alias?: string | string[]
  readonly choices?: readonly string[]
  /**
   * When `true`, the flag is omitted from help output but remains functional.
   * Accepts a boolean or a function that returns a boolean, resolved at registration time.
   */
  readonly hidden?: Resolvable<boolean>
  /**
   * Marks the flag as deprecated. A string value is used as the deprecation message;
   * `true` uses a default message. Resolved at registration time.
   */
  readonly deprecated?: Resolvable<string | boolean>
  /**
   * Group heading under which this flag appears in help output.
   */
  readonly group?: string
}

/**
 * Arg definitions accepted by `command()`.
 *
 * Either a zod object schema (recommended) or a record of yargs-native arg
 * definitions. Both produce the same typed `ctx.args` -- yargs format is
 * converted to zod internally before parsing.
 */
export type ArgsDef = z.ZodObject<z.ZodRawShape> | Record<string, YargsArgDef>

/**
 * Map a single yargs arg def to its TypeScript type.
 *
 * @private
 */
type YargsArgValue<TDef extends YargsArgDef> = TDef['required'] extends true
  ? YargsArgBaseType<TDef['type']>
  : TDef['default'] extends undefined
    ? YargsArgBaseType<TDef['type']> | undefined
    : YargsArgBaseType<TDef['type']>

/**
 * Map a yargs type string to its corresponding TypeScript type.
 *
 * @private
 */
type YargsArgBaseType<TType extends string> = TType extends 'string'
  ? string
  : TType extends 'number'
    ? number
    : TType extends 'boolean'
      ? boolean
      : TType extends 'array'
        ? string[]
        : unknown

/**
 * Resolve the parsed args type from either format.
 */
export type InferArgs<TDef extends ArgsDef> =
  TDef extends z.ZodObject<z.ZodRawShape>
    ? z.infer<TDef>
    : TDef extends Record<string, YargsArgDef>
      ? { [Key in keyof TDef]: YargsArgValue<TDef[Key]> }
      : AnyRecord

/**
 * Merge inferred types from options and positionals into a single args type.
 *
 * Produces the intersection of both inferred types, giving the handler a
 * unified `ctx.args` containing all flags and positional values.
 */
export type InferArgsMerged<
  TOptionsDef extends ArgsDef,
  TPositionalsDef extends ArgsDef,
> = InferSingleArgsDef<TOptionsDef> & InferSingleArgsDef<TPositionalsDef>

/**
 * Infer the parsed type from a single args definition.
 *
 * Handles the Zod vs yargs-native distinction for a single `ArgsDef`.
 *
 * @private
 */
type InferSingleArgsDef<TDef extends ArgsDef> =
  TDef extends z.ZodObject<z.ZodRawShape> ? z.infer<TDef> : InferArgs<TDef & ArgsDef>

/**
 * Handler function for a command. Receives the fully typed context.
 *
 * @typeParam TArgs - Parsed args type.
 * @typeParam TVars - Context variables contributed by typed middleware.
 */
export type HandlerFn<
  TArgs extends AnyRecord = AnyRecord,
  TVars = {}, // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity
> = (ctx: CommandContext<TArgs> & Readonly<TVars>) => Promise<void> | void

/**
 * Internal render function signature used by `screen()` commands.
 *
 * The runtime detects this property on a Command and delegates to it
 * instead of calling `handler`. Not part of the public `command()` API.
 *
 * @private
 */
export type ScreenRenderFn = (ctx: CommandContext) => Promise<void> | void

/**
 * Structured configuration for a command's subcommands.
 *
 * Groups the command source (inline map or directory path) into a single
 * cohesive object.
 */
export interface CommandsConfig {
  /**
   * Directory path to autoload subcommand files from.
   * Mutually exclusive with `commands` within this config object.
   */
  readonly path?: string

  /**
   * Inline subcommand map or a promise from `autoload()`.
   * Mutually exclusive with `path` within this config object.
   */
  readonly commands?: CommandMap | Promise<CommandMap>
}

/**
 * Options passed to `command()`.
 *
 * @typeParam TOptionsDef - Option (flag) definitions type.
 * @typeParam TPositionalsDef - Positional argument definitions type.
 * @typeParam TMiddleware - Tuple of typed middleware, preserving per-element `TEnv`.
 */
export interface CommandDef<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
  TMiddleware extends readonly Middleware<MiddlewareEnv>[] = readonly Middleware<MiddlewareEnv>[],
> {
  /**
   * Explicit command name. When provided, overrides the filename-derived name
   * used by `autoload()` or the key in a `CommandMap`.
   */
  readonly name?: string

  /**
   * Alternative names for this command (e.g. `['ws']` for `workspace`).
   * Registered as yargs command aliases.
   */
  readonly aliases?: readonly string[]

  /**
   * Human-readable description shown in help text.
   * Accepts a string or a function that returns a string, resolved at registration time.
   */
  readonly description?: Resolvable<string>

  /**
   * When `true`, the command is omitted from help output but remains executable.
   * Accepts a boolean or a function that returns a boolean, resolved at registration time.
   */
  readonly hidden?: Resolvable<boolean>

  /**
   * Marks the command as deprecated. When set, yargs displays the command with
   * a deprecation notice in help output and prints a warning when invoked.
   * A string value is used as the deprecation message; `true` uses a default message.
   * Accepts a static value or a function, resolved at registration time.
   */
  readonly deprecated?: Resolvable<string | boolean>

  /**
   * Option (flag) definitions -- zod object schema (recommended) or yargs-native format.
   *
   * These are registered as named `--flag` options on the command.
   */
  readonly options?: TOptionsDef

  /**
   * Positional argument definitions -- zod object schema (recommended) or yargs-native format.
   *
   * Each key becomes a positional placeholder in the command string. Key order
   * from the schema determines positional order. Required fields produce
   * `<name>` placeholders; optional fields produce `[name]`.
   *
   * Both `options` and `positionals` are merged into `ctx.args` at runtime.
   */
  readonly positionals?: TPositionalsDef

  /**
   * Command-level middleware. Runs inside the root middleware chain, wrapping the handler.
   */
  readonly middleware?: TMiddleware

  /**
   * Nested subcommands — a static map, a promise from `autoload()`, or a
   * structured {@link CommandsConfig} grouping the source.
   */
  readonly commands?: CommandMap | Promise<CommandMap> | CommandsConfig

  /**
   * Help output customization (header, footer, subcommand order).
   */
  readonly help?: HelpOptions

  /**
   * When `true` (inherited default), yargs rejects unknown flags for this command.
   * Set to `false` to allow unknown flags to pass through unchecked,
   * overriding the CLI-level `strict` setting.
   */
  readonly strict?: boolean

  /**
   * The command handler.
   */
  readonly handler?: HandlerFn<
    InferArgsMerged<TOptionsDef, TPositionalsDef>,
    InferVariables<TMiddleware>
  >
}

/**
 * A resolved command object. Returned by command().
 */
export type Command<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
  TMiddleware extends readonly Middleware<MiddlewareEnv>[] = readonly Middleware<MiddlewareEnv>[],
> = Tagged<
  {
    readonly name?: string
    readonly aliases?: readonly string[]
    readonly description?: string
    readonly hidden?: boolean
    readonly deprecated?: string | boolean
    readonly options?: TOptionsDef
    readonly positionals?: TPositionalsDef
    readonly middleware?: TMiddleware
    readonly commands?: CommandMap | Promise<CommandMap>
    readonly render?: ScreenRenderFn
    readonly strict?: boolean
    readonly help?: HelpOptions
    readonly handler?: HandlerFn<
      InferArgsMerged<TOptionsDef, TPositionalsDef>,
      InferVariables<TMiddleware>
    >
  },
  'Command'
>

/**
 * A map of command name to resolved {@link Command}. Used for subcommands and the manifest.
 */
export interface CommandMap {
  readonly [name: string]: Command
}

/**
 * Options accepted by `autoload()`.
 */
export interface AutoloadOptions {
  /**
   * Directory to scan for command files. Defaults to the directory of the calling file.
   */
  readonly dir?: string
}

/**
 * Signature of the `command()` factory function.
 */
export type CommandFn = <
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
  const TMiddleware extends readonly Middleware<MiddlewareEnv>[] =
    readonly Middleware<MiddlewareEnv>[],
>(
  def: CommandDef<TOptionsDef, TPositionalsDef, TMiddleware>
) => Command
