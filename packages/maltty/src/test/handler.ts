import { attemptAsync } from 'es-toolkit'
import { match } from 'ts-pattern'

import type { AnyRecord } from '@/types/index.js'

import { createTestContext } from './context.js'
import { normalizeError } from './normalize-error.js'
import type { HandlerResult, RunHandlerOptions } from './types.js'

/**
 * Execute a single command handler in isolation with a test context.
 *
 * Creates a test context with the given overrides, calls the command's handler,
 * and captures any ContextError thrown by `ctx.fail()`.
 *
 * @param options - The command and optional test context overrides.
 * @returns A HandlerResult with the context, captured stdout, and any error.
 */
export async function runHandler<TArgs extends AnyRecord = AnyRecord>({
  cmd,
  overrides,
}: RunHandlerOptions<TArgs>): Promise<HandlerResult<TArgs>> {
  const { ctx, stdout } = createTestContext<TArgs>(overrides)

  if (!cmd.handler) {
    return { ctx, error: undefined, stdout }
  }

  const { handler } = cmd
  const [error] = await attemptAsync(async () => handler(ctx))

  return {
    ctx,
    error: match(error)
      .with(null, () => undefined)
      .otherwise(normalizeError),
    stdout,
  }
}
