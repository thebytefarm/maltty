import { isFunction } from '@maltty/utils/fp'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import { createHttpClient } from './create-http-client.js'
import type { HttpOptions } from './types.js'

/**
 * Create an HTTP client middleware that decorates the context
 * with a typed client.
 *
 * This middleware is fully decoupled from auth. For automatic credential
 * injection, pass a header resolver via the `headers` option (e.g. `auth.headers()`).
 *
 * Resolves headers from the `headers` option (static record or function),
 * builds a typed {@link HttpClient}, and attaches it to `ctx[namespace]`.
 *
 * @param options - HTTP middleware configuration.
 * @returns A Middleware that adds an HttpClient to ctx[namespace].
 */
export function http(options: HttpOptions): Middleware {
  const { namespace, baseUrl, headers } = options

  return middleware(async (ctx, next) => {
    const resolvedHeaders = await resolveHeaders(ctx, headers)

    const client = createHttpClient({
      baseUrl,
      defaultHeaders: resolvedHeaders,
    })

    decorateContext(ctx, namespace, client)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve headers from the options value.
 *
 * Calls the function form with ctx when provided (awaiting if it returns a
 * Promise), returns static headers directly, or returns undefined when no
 * headers are configured.
 *
 * @private
 * @param ctx - The context object.
 * @param headers - The headers option (static, sync/async function, or undefined).
 * @returns The resolved headers record or undefined.
 */
async function resolveHeaders(
  ctx: CommandContext,
  headers: HttpOptions['headers']
): Promise<Readonly<Record<string, string>> | undefined> {
  if (headers === undefined) {
    return undefined
  }

  if (isFunction(headers)) {
    return headers(ctx)
  }

  return headers
}
