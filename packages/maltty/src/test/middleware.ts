import type { AnyRecord, Middleware } from '@/types/index.js'

import { createTestContext } from './context.js'
import type { MiddlewareResult, RunMiddlewareOptions } from './types.js'

/**
 * Execute a middleware chain with a test context and a terminal no-op handler.
 *
 * Creates a test context, runs each middleware in order, and invokes a
 * no-op final handler. Returns the decorated context and captured output.
 *
 * @param options - The middlewares and optional test context overrides.
 * @returns A MiddlewareResult with the context and captured stdout.
 */
export async function runMiddleware<TArgs extends AnyRecord = AnyRecord>({
  middlewares,
  overrides,
}: RunMiddlewareOptions<TArgs>): Promise<MiddlewareResult<TArgs>> {
  const { ctx, stdout } = createTestContext<TArgs>(overrides)

  await executeChain(middlewares, 0, ctx, async () => {})

  return { ctx, stdout }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recursively execute middleware in order, calling next after the last one.
 *
 * @private
 * @param middlewares - The middleware array.
 * @param index - Current position in the array.
 * @param ctx - The context object.
 * @param next - The downstream next function.
 */
async function executeChain(
  middlewares: readonly Middleware[],
  index: number,
  ctx: unknown,
  next: () => Promise<void>
): Promise<void> {
  if (index >= middlewares.length) {
    await next()
    return
  }

  const mw = middlewares[index] as Middleware

  await mw.handler(ctx as Parameters<Middleware['handler']>[0], () =>
    executeChain(middlewares, index + 1, ctx, next)
  )
}
