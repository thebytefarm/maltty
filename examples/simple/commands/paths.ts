import { sep } from 'node:path'

import { command } from 'maltty'
import { match } from 'ts-pattern'

/**
 * Exercise path-related context APIs so cross-platform integration tests
 * can verify that maltty never produces mixed or hardcoded separators.
 */
export default command({
  description: 'Display resolved paths for this CLI',
  handler: (ctx) => {
    const globalDotdir = ctx.dotdir.global()
    const [localError, localDotdir] = ctx.dotdir.local()

    const [globalPathError, globalConfigPath] = globalDotdir.path('config.json')
    const localConfigPath = match(localError)
      .with(null, () => {
        const [pathError, resolved] = localDotdir!.path('config.json')
        if (pathError) {
          return null
        }
        return resolved
      })
      .otherwise(() => null)

    process.stdout.write(
      ctx.format.json({
        cwd: process.cwd(),
        globalDir: globalDotdir.dir,
        globalConfigPath: globalPathError ? null : globalConfigPath,
        localDir: localError ? null : localDotdir!.dir,
        localConfigPath,
        meta: {
          name: ctx.meta.name,
          dirs: ctx.meta.dirs,
        },
        sep,
      })
    )
  },
})
