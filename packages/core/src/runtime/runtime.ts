import { attemptAsync, err, ok } from '@maltty/utils/fp'
import type { ResultAsync } from '@maltty/utils/fp'

import { createContext } from '@/context/index.js'
import type { CommandContext } from '@/context/types.js'
import type { Middleware } from '@/types/index.js'

import { createArgsParser } from './args/index.js'
import { createMiddlewareExecutor } from './runner.js'
import type { ResolvedExecution, Runtime, RuntimeOptions } from './types.js'

/**
 * Create a runtime that orchestrates middleware execution.
 *
 * Captures middleware in a closure alongside a runner.
 * The returned `runtime.execute` method handles arg parsing, context creation,
 * and middleware chain execution for each command invocation.
 *
 * @param options - Runtime configuration including name, version, and middleware.
 * @returns A ResultAsync containing the runtime or an error.
 */
export async function createRuntime(options: RuntimeOptions): ResultAsync<Runtime, Error> {
  const middleware: Middleware[] = options.middleware ?? []
  const runner = createMiddlewareExecutor(middleware)

  const runtime = {
    async execute(command: ResolvedExecution): ResultAsync<void, Error> {
      const parser = createArgsParser({
        options: command.options,
        positionals: command.positionals,
      })
      const [argsError, validatedArgs] = parser.parse(command.rawArgs)
      if (argsError) {
        return err(argsError)
      }

      const ctx = createContext({
        args: validatedArgs,
        argv: options.argv,
        display: options.display,
        log: options.log,
        meta: {
          command: [...command.commandPath],
          dirs: options.dirs,
          name: options.name,
          version: options.version,
        },
        prompts: options.prompts,
        status: options.status,
      })

      const finalHandler = command.render ?? command.handler ?? (async () => {})

      // Accepted exception: generic context assembly requires type assertions.
      // The generics are validated at the createContext call site.
      const [execError] = await attemptAsync(() =>
        runner.execute({
          ctx: ctx as CommandContext,
          handler: finalHandler as (ctx: CommandContext) => Promise<void> | void,
          middleware: command.middleware,
        })
      )
      if (execError) {
        return err(execError)
      }

      return ok()
    },
  } satisfies Runtime

  return ok(runtime)
}
