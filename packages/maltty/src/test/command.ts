import { attemptAsync } from 'es-toolkit'
import { match } from 'ts-pattern'
import { vi } from 'vitest'

import type { CliOptions } from '@/types/index.js'

import { normalizeError } from './normalize-error.js'
import type { CommandResult, RunCommandOptions } from './types.js'

// eslint-disable-next-line no-control-regex -- ANSI escape stripping requires control character matching
const ANSI_ESCAPE_RE = /\u001B\[[0-9;]*[a-zA-Z]/g

/**
 * Execute a full CLI pipeline in-process for integration testing.
 *
 * Overrides `process.argv`, dynamically imports and runs `cli()`, stubs
 * `process.exit`, and restores all state on completion. ANSI escape codes
 * are stripped by default.
 *
 * Note: stdout capture is not available for integration tests because the
 * CLI creates its own logger internally. Use `runHandler` for output assertions.
 * Note: This function mutates `process.argv` and stubs `process.exit` for the
 * duration of the call. Parallel invocations are not safe.
 *
 * @param options - CLI invocation options including args, commands, and middleware.
 * @returns A CommandResult with exit code and any error.
 */
export async function runCommand(options: RunCommandOptions): Promise<CommandResult> {
  const originalArgv = [...process.argv]
  const exitCapture: { exitCode: number | undefined } = { exitCode: undefined }

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCapture.exitCode = code ?? 0
  }) as () => never)

  process.argv = ['node', 'test', ...options.args]

  const [error] = await attemptAsync(async () => {
    const { cli } = await import('@/cli.js')

    const cliOptions: CliOptions = {
      commands: options.commands,
      middleware: options.middleware,
      name: options.name ?? 'test-cli',
      version: options.version ?? '0.0.0',
    }

    await cli(cliOptions)
  })

  process.argv = [...originalArgv]
  exitSpy.mockRestore()

  return {
    error: match(error)
      .with(null, () => undefined)
      .otherwise(normalizeError),
    exitCode: exitCapture.exitCode,
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Strip ANSI escape codes from a string.
 *
 * @private
 * @param text - The raw text potentially containing ANSI codes.
 * @returns The cleaned text.
 */
export function stripAnsi(text: string): string {
  return text.replaceAll(ANSI_ESCAPE_RE, '')
}
