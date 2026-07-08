import type { CommandContext } from '@/context/types.js'
import type { Middleware } from '@/types/index.js'

import type { MiddlewareExecutor } from './types.js'

/**
 * Create a runner that executes root and command middleware chains.
 *
 * Root middleware wraps the command middleware chain, which in turn wraps
 * the command handler — producing a nested onion lifecycle:
 *
 * ```
 * root middleware start →
 *   command middleware start →
 *     handler
 *   command middleware end
 * root middleware end
 * ```
 *
 * @param rootMiddleware - Root-level middleware from `cli({ middleware })`.
 * @returns A MiddlewareExecutor with an execute method.
 */
export function createMiddlewareExecutor(rootMiddleware: Middleware[]): MiddlewareExecutor {
  return {
    async execute({ ctx, handler, middleware }): Promise<void> {
      const commandHandler = async (innerCtx: CommandContext): Promise<void> => {
        await runMiddlewareChain(middleware, innerCtx, handler)
      }
      await runMiddlewareChain(rootMiddleware, ctx, commandHandler)
    },
  } satisfies MiddlewareExecutor
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Execute a middleware chain followed by a final handler.
 *
 * Runs each middleware in order, passing `ctx` and a `next` callback.
 * When all middleware have called `next()`, the final handler is invoked.
 * A middleware can short-circuit by not calling `next()`.
 *
 * @private
 * @param middlewares - Ordered array of middleware to execute.
 * @param ctx - The context object threaded through middleware and handler.
 * @param finalHandler - The command handler to invoke after all middleware.
 */
async function runMiddlewareChain(
  middlewares: Middleware[],
  ctx: CommandContext,
  finalHandler: (ctx: CommandContext) => Promise<void> | void
): Promise<void> {
  async function executeChain(index: number): Promise<void> {
    if (index >= middlewares.length) {
      await finalHandler(ctx)
      return
    }
    const mw = middlewares[index]
    if (mw) {
      await mw.handler(ctx, () => executeChain(index + 1))
    }
  }

  await executeChain(0)
}
