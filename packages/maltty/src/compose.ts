import { middleware } from './middleware.js'
import type { InferVariables, Middleware, MiddlewareEnv } from './types/index.js'

/**
 * The composed return environment. Uses a conditional type to normalize
 * `unknown` (produced by empty tuples) into `Record<string, unknown>`,
 * satisfying the `MiddlewareEnv` constraint.
 */
interface ComposedEnv<TMiddleware extends readonly Middleware<MiddlewareEnv>[]> {
  readonly Variables: InferVariables<TMiddleware> extends infer V
    ? unknown extends V
      ? Record<string, unknown>
      : V
    : never
}

/**
 * Compose multiple middleware into a single middleware.
 *
 * Executes each middleware in order, threading `next()` through the chain.
 * The final `next()` call from the last composed middleware continues to
 * the downstream middleware or command handler.
 *
 * The returned middleware's type merges all `Variables` from the input tuple,
 * so downstream handlers see the combined context.
 *
 * @param middlewares - An ordered tuple of middleware to compose.
 * @returns A single Middleware whose Variables is the intersection of all input Variables.
 *
 * @example
 * ```ts
 * const combined = compose([auth({ strategies: [auth.env()] }), auth.require()])
 * ```
 */
export function compose<const TMiddleware extends readonly Middleware<MiddlewareEnv>[]>(
  middlewares: TMiddleware
): Middleware<ComposedEnv<TMiddleware>> {
  return middleware((ctx, next) => executeChain(middlewares, 0, ctx, next)) as Middleware<
    ComposedEnv<TMiddleware>
  >
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recursively execute middleware in order, calling next() after the last one.
 *
 * @private
 * @param middlewares - The middleware array.
 * @param index - Current position in the array.
 * @param ctx - The context object.
 * @param next - The downstream next function.
 */
async function executeChain(
  middlewares: readonly Middleware<MiddlewareEnv>[],
  index: number,
  ctx: Parameters<Middleware['handler']>[0],
  next: () => Promise<void>
): Promise<void> {
  if (index >= middlewares.length) {
    await next()
    return
  }

  const mw = middlewares[index]

  if (mw === undefined) {
    await next()
    return
  }

  await mw.handler(ctx, () => executeChain(middlewares, index + 1, ctx, next))
}
