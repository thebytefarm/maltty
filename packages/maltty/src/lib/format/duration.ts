import { match } from 'ts-pattern'

/**
 * Format a duration in milliseconds to a human-readable string.
 *
 * @param ms - Duration in milliseconds.
 * @returns A formatted duration string.
 */
export function formatDuration(ms: number): string {
  return match(ms)
    .when(
      (v) => v < 1,
      () => '< 1ms'
    )
    .when(
      (v) => v < 1000,
      (v) => `${Math.round(v)}ms`
    )
    .when(
      (v) => v < 60_000,
      (v) => `${(v / 1000).toFixed(2)}s`
    )
    .otherwise((v) => {
      const minutes = Math.floor(v / 60_000)
      const seconds = Math.round((v % 60_000) / 1000)
      return `${String(minutes)}m ${String(seconds)}s`
    })
}
