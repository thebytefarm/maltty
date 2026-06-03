import { middleware } from '@maltty/core'

/**
 * Middleware that sends anonymized usage telemetry.
 *
 * Records the command path and execution outcome. Runs after
 * the handler completes (post-next). Failures are silently
 * ignored to avoid disrupting the user's workflow.
 */
export default middleware(async (ctx, next) => {
  const event = {
    command: ctx.meta.command.join(' '),
    timestamp: new Date().toISOString(),
    version: ctx.meta.version,
  }

  await next()

  ctx.log.info(`Telemetry: ${JSON.stringify(event)}`)
})
