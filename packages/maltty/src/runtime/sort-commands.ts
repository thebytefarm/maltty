import { err, ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'

import type { Command } from '@/types/index.js'

/**
 * Validate that every name in the order array exists in the provided command names.
 *
 * @param params - The order array and available command names to validate against.
 * @returns A Result tuple — `[null, void]` on success or `[Error, null]` on failure.
 */
export function validateCommandOrder(params: {
  readonly order: readonly string[]
  readonly commandNames: readonly string[]
}): Result<void, Error> {
  const { order, commandNames } = params

  const seen = new Set<string>()
  const duplicates = order.filter((name) => {
    if (seen.has(name)) {
      return true
    }
    seen.add(name)
    return false
  })

  if (duplicates.length > 0) {
    return err(
      `Invalid command order: duplicate command(s) ${[...new Set(duplicates)].map((n) => `"${n}"`).join(', ')}`
    )
  }

  const nameSet = new Set(commandNames)
  const invalid = order.filter((name) => !nameSet.has(name))

  if (invalid.length > 0) {
    return err(
      `Invalid command order: unknown command(s) ${invalid.map((n) => `"${n}"`).join(', ')}`
    )
  }

  return ok()
}

/**
 * Sort command entries with ordered names first (in specified order),
 * remaining names alphabetically.
 *
 * @param params - The command entries and optional order array.
 * @returns Sorted array of `[name, Command]` entries.
 */
export function sortCommandEntries(params: {
  readonly entries: readonly (readonly [string, Command])[]
  readonly order?: readonly string[]
}): readonly (readonly [string, Command])[] {
  const { entries, order } = params

  if (!order || order.length === 0) {
    return [...entries].toSorted(([a], [b]) => a.localeCompare(b))
  }

  const entryMap = new Map(entries)

  const ordered = order
    .filter((name) => entryMap.has(name))
    .map((name): readonly [string, Command] => [name, entryMap.get(name) as Command])

  const orderedSet = new Set(order)
  const remaining = entries
    .filter(([name]) => !orderedSet.has(name))
    .toSorted(([a], [b]) => a.localeCompare(b))

  return [...ordered, ...remaining]
}
