import { match } from 'ts-pattern'

import type { PromptOption } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Direction of navigation input.
 */
export type Direction = 'up' | 'down' | 'none'

/**
 * Options for computing the next focus index.
 */
export interface NextFocusOptions<TValue> {
  readonly options: readonly PromptOption<TValue>[]
  readonly currentIndex: number
  readonly direction: Direction
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Resolve a keyboard event to a navigation direction.
 *
 * @param key - The Ink key object with arrow properties.
 * @returns The resolved direction.
 */
export function resolveDirection(key: {
  readonly upArrow: boolean
  readonly downArrow: boolean
}): Direction {
  return match(key)
    .with({ upArrow: true }, () => 'up' as const)
    .with({ downArrow: true }, () => 'down' as const)
    .otherwise(() => 'none' as const)
}

/**
 * Compute the next focusable option index, skipping disabled options.
 *
 * @param opts - The navigation options.
 * @returns The next valid focus index.
 */
export function resolveNextFocusIndex<TValue>({
  options,
  currentIndex,
  direction,
}: NextFocusOptions<TValue>): number {
  if (direction === 'none') {
    return currentIndex
  }

  const step = match(direction)
    .with('up', () => -1)
    .with('down', () => 1)
    .exhaustive()

  return findNextEnabledIndex(options, currentIndex, step)
}

/**
 * Find the first non-disabled option index.
 *
 * @param options - The option list.
 * @returns The first enabled index, or 0 if none found.
 */
export function resolveFirstEnabledIndex<TValue>(options: readonly PromptOption<TValue>[]): number {
  const index = options.findIndex((o) => o.disabled !== true)
  return Math.max(0, index)
}

/**
 * Options for resolving the initial focus index.
 */
export interface ResolveInitialIndexOptions<TValue> {
  readonly options: readonly PromptOption<TValue>[]
  readonly defaultValue: TValue | undefined
}

/**
 * Resolve the initial focus index from a default value. Falls back to
 * the first non-disabled option if no match is found.
 *
 * @param opts - The resolution options.
 * @returns The initial focus index.
 */
export function resolveInitialIndex<TValue>({
  options,
  defaultValue,
}: ResolveInitialIndexOptions<TValue>): number {
  if (defaultValue !== undefined) {
    const matchIndex = options.findIndex((o) => o.value === defaultValue)
    if (matchIndex !== -1) {
      return matchIndex
    }
  }

  return resolveFirstEnabledIndex(options)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Walk through options in the given step direction to find the next
 * non-disabled index. Returns the current index if no enabled option
 * is found.
 *
 * @private
 * @param options - The option list.
 * @param startIndex - The index to start searching from.
 * @param step - The step direction (-1 or 1).
 * @returns The next enabled index, or the start index if none found.
 */
function findNextEnabledIndex<TValue>(
  options: readonly PromptOption<TValue>[],
  startIndex: number,
  step: number
): number {
  const count = options.length
  const indices = Array.from({ length: count - 1 }, (_, i) => {
    const candidate = startIndex + (i + 1) * step
    return ((candidate % count) + count) % count
  })

  const found = indices.find((i) => {
    const opt = options[i]
    return opt !== undefined && opt.disabled !== true
  })

  return found ?? startIndex
}
