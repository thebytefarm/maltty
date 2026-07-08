import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as clack from '@clack/prompts'
import { P, attempt, match } from '@maltty/utils/fp'

import { DEFAULT_EXIT_CODE, isContextError } from '@/context/index.js'

/**
 * Register global process handlers for uncaught exceptions and unhandled rejections.
 *
 * Converts raw runtime crashes into clean fatal error messages with debug logs.
 * Without these handlers, compiled Bun binaries show raw stack traces with
 * internal bundle line numbers that are meaningless to users.
 *
 * @param _name - The CLI name (reserved for future per-CLI log directories).
 */
export function registerCrashHandlers(_name: string): void {
  process.on('uncaughtException', handleUnexpectedError)
  process.on('unhandledRejection', handleUnexpectedError)
}

/**
 * Handle a CLI error by logging the message and exiting with the appropriate code.
 *
 * ContextErrors are intentional user-facing errors (from `ctx.fail()`) and are
 * displayed cleanly without a crash log. All other errors are delegated to
 * {@link handleUnexpectedError} which writes a debug log to the OS temp directory.
 *
 * @param error - The caught error value.
 */
export function exitOnError(error: unknown): void {
  if (isContextError(error)) {
    clack.log.error(error.message)
    process.exit(error.exitCode)
    return
  }

  handleUnexpectedError(error)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Handle an unexpected (non-ContextError) error by writing a crash log and exiting.
 *
 * Resolves the error to an Error instance, writes a debug log to `/tmp`,
 * prints a clean message, and exits with the default exit code.
 *
 * @private
 * @param error - The caught error value.
 */
function handleUnexpectedError(error: unknown): void {
  const resolved = match(error)
    .with(P.instanceOf(Error), (e) => e)
    .otherwise((e) => new Error(String(e)))

  const logPath = writeCrashLog(resolved)

  clack.log.error(resolved.message)
  if (logPath) {
    clack.log.message(`Debug log: ${logPath}`)
  }
  process.exit(DEFAULT_EXIT_CODE)
}

/**
 * Format the error cause as a log line, or return an empty array when absent.
 *
 * @private
 * @param cause - The error's `cause` value, if any.
 * @returns An array with zero or one formatted cause line.
 */
function formatCause(cause: unknown): readonly string[] {
  if (cause === undefined) {
    return []
  }
  return [`Cause: ${String(cause)}`]
}

/**
 * Write a crash log to the OS temp directory.
 *
 * Includes the error message, stack trace, and basic environment info.
 * Silently returns `undefined` if the write fails — crash logging must
 * never itself cause a crash.
 *
 * @private
 * @param error - The error to log.
 * @returns The path to the written log file, or `undefined` on failure.
 */
function writeCrashLog(error: Error): string | undefined {
  const now = new Date().toISOString()
  const filename = `maltty-crash-${now.replaceAll(':', '-')}.log`
  const logPath = join(tmpdir(), filename)

  const lines = [
    'Maltty Crash Log',
    `Timestamp: ${now}`,
    `Node: ${process.version}`,
    `Platform: ${process.platform} ${process.arch}`,
    `CWD: ${process.cwd()}`,
    '',
    `Error: ${error.message}`,
    '',
    error.stack ?? '(no stack trace)',
    '',
    ...formatCause(error.cause),
  ]

  const [writeError] = attempt(() => writeFileSync(logPath, lines.join('\n'), 'utf8'))
  if (writeError) {
    return undefined
  }

  return logPath
}
