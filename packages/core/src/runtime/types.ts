import type { ResultAsync, Result } from '@maltty/utils/fp'

import type { CommandContext, DisplayConfig, Log, Prompts, Status } from '@/context/types.js'
import type { ArgsDef, Middleware, ResolvedDirs, ScreenRenderFn } from '@/types/index.js'

/**
 * Options for creating a runtime via `createRuntime`.
 */
export interface RuntimeOptions {
  readonly name: string
  readonly version: string
  readonly argv: readonly string[]
  readonly dirs: ResolvedDirs
  readonly middleware?: Middleware[]
  readonly display?: DisplayConfig
  readonly log?: Log
  readonly prompts?: Prompts
  readonly status?: Status
}

/**
 * A resolved command execution descriptor passed to `Runtime.execute`.
 */
export interface ResolvedExecution {
  readonly handler: ((ctx: CommandContext) => Promise<void> | void) | undefined
  readonly render: ScreenRenderFn | undefined
  readonly middleware: Middleware[]
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
  readonly commandPath: readonly string[]
  readonly rawArgs: Record<string, unknown>
}

/**
 * A runtime instance that orchestrates config and middleware execution.
 */
export interface Runtime {
  readonly execute: (command: ResolvedExecution) => ResultAsync<void, Error>
}

/**
 * A runner that executes a middleware chain followed by a final handler.
 */
export interface MiddlewareExecutor {
  readonly execute: (options: {
    readonly ctx: CommandContext
    readonly handler: (ctx: CommandContext) => Promise<void> | void
    readonly middleware: Middleware[]
  }) => Promise<void>
}

/**
 * A parser that cleans and validates raw args against a command's arg definition.
 */
export interface ArgsParser {
  readonly parse: (rawArgs: Record<string, unknown>) => Result<Record<string, unknown>, Error>
}

/**
 * A resolved command reference captured during yargs command registration.
 */
export interface ResolvedCommand {
  readonly handler: ((ctx: CommandContext) => Promise<void> | void) | undefined
  readonly render: ScreenRenderFn | undefined
  readonly middleware: Middleware[]
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
  readonly commandPath: string[]
}

/**
 * Mutable ref holder for the resolved command during yargs parsing.
 */
export interface ResolvedRef {
  ref: ResolvedCommand | undefined
}
