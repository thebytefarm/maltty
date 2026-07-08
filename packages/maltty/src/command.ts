import { match } from '@maltty/utils/fp'
import { withTag } from '@maltty/utils/tag'

import type {
  ArgsDef,
  CommandDef,
  CommandsConfig,
  Middleware,
  MiddlewareEnv,
  Resolvable,
  Command as CommandType,
} from './types/index.js'

/**
 * Check whether a value is a structured {@link CommandsConfig} object.
 *
 * Discriminates from a plain `CommandMap` by checking for the `path` (string)
 * key — which cannot appear on a valid `CommandMap` whose values are tagged
 * `Command` objects.
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a `CommandsConfig`.
 */
export function isCommandsConfig(value: unknown): value is CommandsConfig {
  if (typeof value !== 'object' || value === null || value instanceof Promise) {
    return false
  }
  return Object.hasOwn(value, 'path') && typeof (value as CommandsConfig).path === 'string'
}

/**
 * Define a CLI command with typed options, positionals, config, and handler.
 *
 * The `const TMiddleware` generic preserves the middleware tuple as a literal type,
 * enabling TypeScript to extract and intersect `Variables` from each middleware
 * element onto the handler's `ctx` type.
 *
 * When `def.commands` is a structured {@link CommandsConfig}, the factory
 * normalizes it into a flat `commands` field on the output `Command` object
 * so downstream consumers never need to handle the grouped form.
 *
 * @param def - Command definition including description, options, positionals, middleware, and handler.
 * @returns A resolved Command object for registration in the command map.
 */
export function command<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
  const TMiddleware extends readonly Middleware<MiddlewareEnv>[] =
    readonly Middleware<MiddlewareEnv>[],
>(def: CommandDef<TOptionsDef, TPositionalsDef, TMiddleware>): CommandType {
  const resolved = {
    ...def,
    deprecated: resolveValue(def.deprecated),
    description: resolveValue(def.description),
    hidden: resolveValue(def.hidden),
  }

  return match(resolved.commands)
    .when(isCommandsConfig, (cfg) => {
      const { commands: innerCommands } = cfg
      return withTag({ ...resolved, commands: innerCommands }, 'Command') as CommandType
    })
    .otherwise(() => withTag({ ...resolved }, 'Command') as CommandType)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve a {@link Resolvable} value by invoking it if it is a function,
 * or returning the value directly.
 *
 * @private
 * @param value - A static value or zero-argument factory function.
 * @returns The resolved value, or `undefined` when the input is `undefined`.
 */
function resolveValue<T>(value: Resolvable<T> | undefined): T | undefined {
  if (typeof value === 'function') {
    return (value as () => T)()
  }
  return value
}
