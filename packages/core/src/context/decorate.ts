import type { CommandContext } from './types.js'

/**
 * Add a typed, immutable property to a context instance.
 *
 * Middleware authors use this to extend ctx with custom properties.
 * Pair with module augmentation on CommandContext for type safety:
 *
 * ```ts
 * declare module '@maltty/core' {
 *   interface CommandContext {
 *     readonly github: HttpClient
 *   }
 * }
 * ```
 *
 * **Note:** This function mutates the context object via
 * `Object.defineProperty`. The added property is non-writable and
 * non-configurable, making it effectively frozen after assignment.
 * Mutation is intentional here — the context is assembled incrementally
 * across middleware, and copying the entire object on each decoration
 * would break the single-reference threading model used by the runner.
 *
 * @param ctx - The context instance to decorate (mutated in place).
 * @param key - The property name.
 * @param value - The property value (frozen after assignment).
 * @returns The same ctx reference, now carrying the new property.
 */
export function decorateContext<TKey extends string, TValue>(
  ctx: CommandContext,
  key: TKey,
  value: TValue
): CommandContext {
  Object.defineProperty(ctx, key, { configurable: false, enumerable: true, value, writable: false })
  return ctx
}
