import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

const DEFAULT_MESSAGE = 'Authentication required.'

/**
 * Options for {@link createAuthRequire}.
 */
export interface AuthRequireOptions {
  readonly message?: string
}

/**
 * Create an enforcement middleware that gates on authentication.
 *
 * When `ctx.auth.authenticated()` returns true, the middleware calls
 * `next()`. When not authenticated, it calls `ctx.fail()` with the
 * provided (or default) message. When `ctx.auth` is absent (auth
 * middleware not configured), it calls `ctx.fail()` with an
 * `AUTH_MIDDLEWARE_MISSING` code.
 *
 * @param options - Optional configuration for the require gate.
 * @returns A Middleware that enforces authentication.
 */
export function createAuthRequire(options?: AuthRequireOptions): Middleware {
  const message = resolveMessage(options)

  return middleware((ctx, next) => {
    if (!hasProperty(ctx, 'auth')) {
      ctx.fail('auth.require() must run after auth() middleware', {
        code: 'AUTH_MIDDLEWARE_MISSING',
      })
    }

    if (!ctx.auth.authenticated()) {
      ctx.fail(message, { code: 'AUTH_REQUIRED' })
    }

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Runtime property check that avoids TypeScript's `in` narrowing.
 *
 * The `CommandContext` interface declares `auth` via module augmentation,
 * so `!('auth' in ctx)` narrows to `never`. This function uses an
 * `unknown` cast to bypass the narrowing and perform a pure runtime
 * check.
 *
 * @private
 * @param obj - The object to inspect.
 * @param key - The property name to check.
 * @returns True when the property exists on the object.
 */
function hasProperty(obj: unknown, key: string): boolean {
  return typeof obj === 'object' && obj !== null && Object.hasOwn(obj as object, key)
}

/**
 * Resolve the failure message from optional require options.
 *
 * @private
 * @param options - Optional require gate options.
 * @returns The resolved message string.
 */
function resolveMessage(options: AuthRequireOptions | undefined): string {
  if (options !== undefined && options.message !== undefined) {
    return options.message
  }

  return DEFAULT_MESSAGE
}
