import type { Readable, Writable } from 'node:stream'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Clack-compatible base options produced by {@link resolveClackBase}.
 */
export interface ClackBase {
  readonly withGuide?: boolean
  readonly input?: Readable
  readonly output?: Writable
}

/**
 * Shared empty base object. Returned when no defaults are configured to avoid
 * allocating a new `{}` on every call.
 */
export const EMPTY_CLACK_BASE: Readonly<Record<string, never>> = Object.freeze({})

/**
 * Map display-config-style defaults (`guide`, `input`, `output`) to clack's
 * expected option names (`withGuide`, `input`, `output`).
 *
 * Returns {@link EMPTY_CLACK_BASE} when `defaults` is undefined so callers
 * can spread without allocating a throwaway object.
 *
 * @param defaults - Per-call defaults from display config, if any.
 * @returns A plain object suitable for spreading into clack calls.
 */
export function resolveClackBase(
  defaults:
    | {
        readonly guide?: boolean
        readonly input?: Readable
        readonly output?: Writable
      }
    | undefined
): ClackBase {
  if (defaults === undefined) {
    return EMPTY_CLACK_BASE
  }
  return {
    withGuide: defaults.guide,
    input: defaults.input,
    output: defaults.output,
  }
}

/**
 * Merge clack base defaults with per-call options, skipping the spread when
 * `opts` is undefined.
 *
 * @param base - The resolved clack base defaults.
 * @param opts - Per-call options from the method caller.
 * @returns The merged options object, or `base` if `opts` is undefined.
 */
export function mergeClackOpts<T>(
  base: ClackBase,
  opts: T | undefined
): ClackBase | (ClackBase & T) {
  if (opts === undefined) {
    return base
  }
  return { ...base, ...opts }
}
