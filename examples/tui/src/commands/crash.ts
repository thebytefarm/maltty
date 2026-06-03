import { command } from '@maltty/core'
import { match } from 'ts-pattern'
import { z } from 'zod'

const options = z.object({
  mode: z
    .enum(['throw', 'reject', 'timeout', 'ctx-fail'])
    .default('throw')
    .describe('Crash mode: throw | reject | timeout | ctx-fail'),
})

export default command({
  description: 'Trigger various crash modes to test error handling',
  options,
  handler: (ctx) => {
    match(ctx.args.mode)
      .with('throw', () => {
        // Synchronous throw inside handler — caught by attemptAsync
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Simulated synchronous crash in handler')
      })
      .with('reject', () => {
        // Unhandled promise rejection — caught by registerCrashHandlers
        Promise.reject(new Error('Simulated unhandled promise rejection'))
      })
      .with('timeout', () => {
        // Throw inside setTimeout — caught by uncaughtException handler
        setTimeout(() => {
          // eslint-disable-next-line no-restricted-syntax
          throw new Error('Simulated crash inside setTimeout')
        }, 100)
      })
      .with('ctx-fail', () => {
        // ContextError via ctx.fail — clean exit, no crash log
        ctx.fail('Simulated context failure (clean exit)')
      })
      .exhaustive()
  },
})
