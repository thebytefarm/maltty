import { toError } from '@maltty/utils'
import { match } from 'ts-pattern'

import { isContextError } from '@/context/error.js'

/**
 * Normalize an unknown caught value to an Error instance.
 *
 * Preserves ContextError instances so callers can inspect exit codes and
 * error codes. Falls back to wrapping non-Error values in a plain Error
 * via {@link toError}.
 *
 * @param error - The caught value from a try/catch block.
 * @returns An Error instance.
 */
export function normalizeError(error: unknown): Error {
  return match(error)
    .when(isContextError, (contextError) => contextError)
    .otherwise((value) => toError(value))
}
