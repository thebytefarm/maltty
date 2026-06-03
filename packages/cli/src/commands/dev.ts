import { createBundler } from '@maltty/bundler'
import { loadConfig } from '@maltty/config/utils'
import { command } from '@maltty/core'
import type { Command, CommandContext } from '@maltty/core'

import { extractConfig } from '../lib/config-helpers.js'

/**
 * Start a maltty CLI project in development mode with file watching.
 *
 * Loads the project's `maltty.config.ts`, starts the bundler in watch mode, and
 * logs rebuild status on each successful build.
 */
const devCommand: Command = command({
  description: 'Start a maltty CLI project in development mode',
  handler: async (ctx: CommandContext) => {
    const cwd = process.cwd()

    const [, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

    ctx.status.spinner.start('Starting dev server...')

    const bundler = await createBundler({ config, cwd })
    const onSuccess = createOnSuccess(ctx)

    const [watchError] = await bundler.watch({ onSuccess })

    if (watchError) {
      ctx.status.spinner.stop('Watch failed')
      return ctx.fail(watchError.message)
    }
  },
})

export default devCommand

// ---------------------------------------------------------------------------

/**
 * Create an onSuccess callback that tracks first-build state.
 *
 * On the first invocation the spinner is stopped and a "watching" message is
 * logged. Subsequent invocations log a "rebuilt" message instead.
 *
 * Uses a mutable container object inside the closure to track build count
 * without `let` reassignment.
 *
 * @private
 * @param ctx - The command context for logging and spinner access.
 * @returns A callback suitable for the watch `onSuccess` parameter.
 */
function createOnSuccess(ctx: CommandContext): () => void {
  const state = { buildCount: 0 }

  return () => {
    if (state.buildCount === 0) {
      state.buildCount = 1
      ctx.status.spinner.stop('Watching for changes...')
      return
    }

    ctx.log.success('Rebuilt successfully')
  }
}
