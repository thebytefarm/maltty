import { middleware } from 'maltty'

/**
 * Middleware that enforces authentication on a command.
 *
 * Checks `ctx.auth.authenticated()` and short-circuits with
 * `ctx.fail()` when no credential is present. Must be registered
 * after `auth()` since it depends on `ctx.auth`.
 */
const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `demo login` first.')
  }

  return next()
})

export default requireAuth
