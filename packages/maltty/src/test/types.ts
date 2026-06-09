import type { vi } from 'vitest'

import type { CommandContext, Log, Prompts, Status } from '@/context/types.js'
import type { AnyRecord, Command, CommandMap, Middleware, ResolvedDirs } from '@/types/index.js'

/**
 * Overrides for constructing a test context via {@link createTestContext}.
 *
 * All fields are optional — sensible defaults are provided for each.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface TestContextOptions<TArgs extends AnyRecord = AnyRecord> {
  readonly args?: TArgs
  readonly meta?: {
    readonly name?: string
    readonly version?: string
    readonly command?: string[]
    readonly dirs?: ResolvedDirs
  }
  readonly log?: Log
  readonly prompts?: Prompts
  readonly status?: Status
}

/**
 * Result of {@link createTestContext}.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface TestContextResult<TArgs extends AnyRecord = AnyRecord> {
  readonly ctx: CommandContext<TArgs>
  readonly stdout: () => string
}

/**
 * Result of {@link runHandler}.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface HandlerResult<TArgs extends AnyRecord = AnyRecord> {
  readonly ctx: CommandContext<TArgs>
  readonly stdout: () => string
  readonly error: Error | undefined
}

/**
 * Result of {@link runMiddleware}.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface MiddlewareResult<TArgs extends AnyRecord = AnyRecord> {
  readonly ctx: CommandContext<TArgs>
  readonly stdout: () => string
}

/**
 * Pre-programmed responses for mock prompts.
 *
 * Each field is an ordered queue — responses are consumed in sequence.
 */
export interface PromptResponses {
  readonly confirm?: readonly boolean[]
  readonly text?: readonly string[]
  readonly select?: readonly unknown[]
  readonly multiselect?: readonly unknown[][]
  readonly password?: readonly string[]
  readonly autocomplete?: readonly unknown[]
  readonly autocompleteMultiselect?: readonly unknown[][]
  readonly groupMultiselect?: readonly unknown[][]
  readonly selectKey?: readonly string[]
  readonly path?: readonly string[]
}

/**
 * Options for {@link runHandler}.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface RunHandlerOptions<TArgs extends AnyRecord = AnyRecord> {
  readonly cmd: Command
  readonly overrides?: TestContextOptions<TArgs>
}

/**
 * Options for {@link runMiddleware}.
 *
 * @typeParam TArgs - Parsed args type for the context.
 */
export interface RunMiddlewareOptions<TArgs extends AnyRecord = AnyRecord> {
  readonly middlewares: readonly Middleware[]
  readonly overrides?: TestContextOptions<TArgs>
}

/**
 * Options for {@link runCommand}.
 */
export interface RunCommandOptions {
  readonly args: readonly string[]
  readonly commands: CommandMap | Promise<CommandMap>
  readonly name?: string
  readonly version?: string
  readonly middleware?: Middleware[]
}

/**
 * Result of {@link runCommand}.
 *
 * Note: stdout capture is not available at the integration level because the
 * CLI creates its own logger internally. Use `runHandler` or `createTestContext`
 * for output assertions.
 */
export interface CommandResult {
  readonly exitCode: number | undefined
  readonly error: Error | undefined
}

/**
 * Return type for {@link setupTestLifecycle}.
 */
export interface TestLifecycle {
  getExitSpy(): ReturnType<typeof vi.spyOn>
}
