import type { Tagged } from '@maltty/utils/tag'
import { TAG, hasTag, withTag } from '@maltty/utils/tag'

/**
 * Default process exit code for error conditions.
 */
export const DEFAULT_EXIT_CODE = 1

/**
 * Plain data representation of a ContextError (no Error prototype).
 *
 * Useful for serializing error data without carrying the Error prototype chain,
 * for example when logging or forwarding errors across process boundaries.
 */
export type ContextErrorData = Tagged<
  {
    readonly code: string | undefined
    readonly exitCode: number
    readonly message: string
  },
  'ContextError'
>

/**
 * An Error subtype carrying an exit code and optional error code.
 *
 * Created by {@link createContextError} and thrown by `ctx.fail()`.
 * The CLI boundary catches these to produce clean, user-facing error output
 * with the correct process exit code.
 */
export type ContextError = Error &
  Tagged<
    {
      readonly code: string | undefined
      readonly exitCode: number
    },
    'ContextError'
  >

/**
 * Create a ContextError with an exit code and optional error code.
 *
 * Used to surface user-facing CLI errors with clean messages.
 * The error carries a Symbol-based tag for reliable type-narrowing
 * via {@link isContextError}.
 *
 * @param message - Human-readable error message.
 * @param options - Optional error code and exit code overrides.
 * @returns A ContextError instance.
 */
export function createContextError(
  message: string,
  options?: { code?: string; exitCode?: number }
): ContextError {
  const data = createContextErrorData(message, options)
  // Accepted exception: Error construction requires `new Error()` then property decoration.
  // The `as` cast and Object.defineProperty mutations are the only way to produce a
  // Tagged Error subtype without using a class.
  const error = new Error(data.message) as ContextError
  error.name = 'ContextError'
  // Intentional mutation: decorating an Error object with immutable properties.
  Object.defineProperty(error, TAG, { enumerable: false, value: 'ContextError', writable: false })
  Object.defineProperty(error, 'code', { enumerable: true, value: data.code, writable: false })
  Object.defineProperty(error, 'exitCode', {
    enumerable: true,
    value: data.exitCode,
    writable: false,
  })
  return error
}

/**
 * Type guard that narrows an unknown value to {@link ContextError}.
 *
 * Checks that the value is an Error instance whose `[TAG]` property
 * equals `'ContextError'`, which distinguishes CLI-layer errors from
 * unexpected exceptions.
 *
 * @param error - The value to check.
 * @returns `true` when the value is a ContextError.
 */
export function isContextError(error: unknown): error is ContextError {
  if (error instanceof Error) {
    return hasTag(error, 'ContextError')
  }
  return false
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function resolveExitCode(options: { code?: string; exitCode?: number } | undefined): number {
  if (options && options.exitCode !== undefined) {
    return options.exitCode
  }
  return DEFAULT_EXIT_CODE
}

function resolveCode(
  options: { code?: string; exitCode?: number } | undefined
): string | undefined {
  if (options && options.code !== undefined) {
    return options.code
  }
  return undefined
}

function createContextErrorData(
  message: string,
  options?: { code?: string; exitCode?: number }
): ContextErrorData {
  return withTag(
    {
      code: resolveCode(options),
      exitCode: resolveExitCode(options),
      message,
    },
    'ContextError'
  )
}
