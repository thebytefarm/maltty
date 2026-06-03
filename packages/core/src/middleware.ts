import { withTag } from '@maltty/utils/tag'

import type { Middleware, MiddlewareEnv, MiddlewareFn } from './types/index.js'

/**
 * Create a typed middleware that runs before command handlers.
 *
 * Use the generic parameter to declare context variables the middleware provides.
 * The handler's `ctx` type in downstream commands will include these variables.
 *
 * @param handler - The middleware function receiving ctx and next.
 * @returns A Middleware object for use in the cli() or command() middleware stack.
 *
 * @example
 * ```ts
 * const loadUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
 *   decorateContext(ctx, 'user', await fetchUser())
 *   await next()
 * })
 * ```
 */
export function middleware<TEnv extends MiddlewareEnv = MiddlewareEnv>(
  handler: MiddlewareFn<TEnv>
): Middleware<TEnv> {
  return withTag({ handler }, 'Middleware')
}
