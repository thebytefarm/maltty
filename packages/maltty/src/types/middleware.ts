import type { Tagged } from '@maltty/utils/tag'

import type { CommandContext } from '../context/types.js'
import type { AnyRecord, IsAny, UnionToIntersection } from './utility.js'

// ---------------------------------------------------------------------------
// Middleware types
// ---------------------------------------------------------------------------

/**
 * Environment descriptor for typed middleware.
 * Middleware declares the context variables it provides via the `Variables` property.
 *
 * @example
 * ```ts
 * middleware<{ Variables: { user: User } }>(async (ctx, next) => {
 *   decorateContext(ctx, 'user', await fetchUser())
 *   await next()
 * })
 * ```
 */
export interface MiddlewareEnv {
  readonly Variables?: AnyRecord
}

/**
 * Extracts the `Variables` from a {@link MiddlewareEnv}, guarding against `any`.
 * Returns an empty object when `TEnv` is `any` or has no `Variables`.
 */
export type ExtractVariables<TEnv extends MiddlewareEnv> =
  IsAny<TEnv> extends true
    ? {} // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity
    : TEnv extends { readonly Variables: infer TVars extends AnyRecord }
      ? TVars
      : {} // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity

/**
 * Extracts the `TEnv` type parameter from a {@link Middleware} instance.
 */
export type MiddlewareEnvOf<T> = T extends Middleware<infer TEnv> ? TEnv : MiddlewareEnv

/**
 * Walks a readonly middleware tuple and intersects all `Variables` from each element.
 * Produces the merged context variables type for a command handler.
 *
 * @example
 * ```ts
 * type Vars = InferVariables<[Middleware<{ Variables: { user: User } }>, Middleware<{ Variables: { org: Org } }>]>
 * // { user: User } & { org: Org }
 * ```
 */
export type InferVariables<TMiddleware extends readonly Middleware<MiddlewareEnv>[]> =
  UnionToIntersection<ExtractVariables<MiddlewareEnvOf<TMiddleware[number]>>>

/**
 * The next() function passed to middleware. Call it to continue to the next middleware or handler.
 */
export type NextFunction = () => Promise<void>

/**
 * A middleware function receives ctx and next.
 *
 * The `_TEnv` generic is phantom — it carries the environment type through
 * {@link Middleware} for type inference without affecting the runtime signature.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type MiddlewareFn<_TEnv extends MiddlewareEnv = MiddlewareEnv> = (
  ctx: CommandContext,
  next: NextFunction
) => Promise<void> | void

/**
 * A middleware object wrapping a MiddlewareFn. Returned by the middleware() factory.
 */
export type Middleware<TEnv extends MiddlewareEnv = MiddlewareEnv> = Tagged<
  {
    readonly handler: MiddlewareFn<TEnv>
  },
  'Middleware'
>

/**
 * Signature of the `middleware()` factory function.
 */
export type MiddlewareFnFactory = <TEnv extends MiddlewareEnv = MiddlewareEnv>(
  handler: MiddlewareFn<TEnv>
) => Middleware<TEnv>
