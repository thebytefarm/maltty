import { withTag } from '@maltty/utils/tag'

import type { Command, CommandMap } from '@/types/index.js'

import { isCommand } from './register.js'

/**
 * Resolve every promised subcommand map in a command tree.
 *
 * `cli()` awaits the top-level commands option, but a nested `commands` field may
 * itself be a promise — `autoload()` returns one. Registration is synchronous and
 * an unresolved promise has no own entries, so those subtrees would be skipped
 * during both validation and registration. Awaiting the whole tree up front makes
 * nested autoloading behave like a static map.
 *
 * @param commands - The command map to resolve.
 * @returns A promise resolving to an equivalent map with every nested map awaited.
 */
export async function resolveCommandTree(commands: CommandMap): Promise<CommandMap> {
  const entries = await Promise.all(Object.entries(commands).map(resolveEntry))
  return Object.fromEntries(entries)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve one `[name, Command]` entry, awaiting its subcommand map when present.
 *
 * The tag is reapplied because it is non-enumerable and therefore lost on spread.
 *
 * @private
 * @param entry - The map entry to resolve.
 * @returns A promise resolving to the entry with its subtree awaited.
 */
async function resolveEntry(entry: readonly [string, Command]): Promise<readonly [string, Command]> {
  const [key, cmd] = entry
  if (!isCommand(cmd) || !cmd.commands) {
    return entry
  }

  const nested = await cmd.commands
  return [key, withTag({ ...cmd, commands: await resolveCommandTree(nested) }, 'Command')]
}
