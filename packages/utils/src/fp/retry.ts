import type { Result } from './result.js'

/**
 * Options for {@link retry}.
 *
 * @template TValue - The success value type returned by `fn`.
 * @template TError - The error type returned by `fn`. Defaults to `Error`.
 */
export interface RetryOptions<TValue, TError = Error> {
  /**
   * Maximum number of attempts (including the first call). Must be >= 1.
   * Values < 1 are coerced to 1.
   */
  readonly attempts: number
  /**
   * Base delay (in milliseconds) used to compute exponential backoff between
   * retries. Delay before attempt N (1-indexed) is `baseMs * 2 ^ (N - 1)`,
   * applied only when retrying after a failure (no delay before the first
   * attempt). Values < 0 are coerced to 0.
   */
  readonly baseMs: number
  /**
   * The async operation to execute. Must return a `Result` tuple — never
   * throw. The first `ok` result short-circuits the loop; otherwise the last
   * `err` is returned after exhausting `attempts`.
   */
  readonly fn: () => Promise<Result<TValue, TError>>
}

/**
 * Retry an async `Result`-returning operation with exponential backoff.
 *
 * Calls `fn` up to `attempts` times, returning the first `ok` result. On
 * exhaustion, returns the last `err` — never throws. Backoff between retries
 * follows `baseMs * 2 ^ (attempt - 1)`:
 *
 * | Attempt | Delay before this attempt |
 * | ------- | ------------------------- |
 * | 1       | 0 (immediate)             |
 * | 2       | `baseMs`                  |
 * | 3       | `baseMs * 2`              |
 * | 4       | `baseMs * 4`              |
 *
 * A successful first attempt skips all retries and never schedules a timer.
 *
 * @param options - Retry configuration.
 * @param options.attempts - Maximum number of attempts (>= 1).
 * @param options.baseMs - Base delay in milliseconds for exponential backoff.
 * @param options.fn - Async `Result`-returning operation to retry.
 * @returns A `Result` tuple — the first success, or the last failure on
 *   exhaustion. Never rejects.
 */
export async function retry<TValue, TError = Error>({
  attempts,
  baseMs,
  fn,
}: RetryOptions<TValue, TError>): Promise<Result<TValue, TError>> {
  const safeAttempts = Math.max(1, attempts)
  const safeBaseMs = Math.max(0, baseMs)
  return runAttempt({ attempt: 1, baseMs: safeBaseMs, fn, maxAttempts: safeAttempts })
}

// ---------------------------------------------------------------------------

/**
 * Execute a single retry attempt and recurse into the next attempt on failure.
 *
 * Implemented via tail recursion to avoid `let` / loops while preserving the
 * exponential-backoff schedule. Returns the first success or the last failure
 * when attempts are exhausted.
 *
 * @param params - Attempt parameters.
 * @param params.attempt - The current 1-indexed attempt number.
 * @param params.baseMs - Base delay in milliseconds for exponential backoff.
 * @param params.fn - The async `Result`-returning operation under retry.
 * @param params.maxAttempts - Total number of attempts allowed.
 * @returns The success result, or the last error on exhaustion.
 *
 * @private
 */
async function runAttempt<TValue, TError>(params: {
  readonly attempt: number
  readonly baseMs: number
  readonly fn: () => Promise<Result<TValue, TError>>
  readonly maxAttempts: number
}): Promise<Result<TValue, TError>> {
  const { attempt, baseMs, fn, maxAttempts } = params
  const result = await fn()
  const [error] = result
  if (!error) {
    return result
  }
  if (attempt >= maxAttempts) {
    return result
  }
  const delayMs = baseMs * 2 ** (attempt - 1)
  await delay(delayMs)
  return runAttempt({ attempt: attempt + 1, baseMs, fn, maxAttempts })
}

/**
 * Resolve after `ms` milliseconds via `setTimeout`.
 *
 * Promise wrapper to keep `runAttempt` free of imperative timer plumbing.
 *
 * @param ms - Delay in milliseconds.
 * @returns A promise that resolves once the timer fires.
 *
 * @private
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
