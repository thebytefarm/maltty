import { join } from 'node:path'

import { loadConfig } from '@maltty/config/utils'
import { autoload, command } from '@maltty/core'
import type { Command as MalttyCommand, CommandContext } from '@maltty/core'
import { fs } from '@maltty/utils/node'

import { extractConfig } from '../lib/config-helpers.js'

/**
 * A single node in the rendered command tree.
 */
interface TreeEntry {
  readonly name: string
  readonly description: string
  readonly children: readonly TreeEntry[]
}

/**
 * Display the command tree for a maltty CLI project.
 *
 * Loads the project's `maltty.config.ts` to locate the commands directory,
 * scans it with the autoloader, and prints an ASCII tree of all discovered
 * commands and subcommands.
 */
const commandsCommand: MalttyCommand = command({
  description: 'Display the command tree for a maltty CLI project',
  handler: async (ctx: CommandContext) => {
    const cwd = process.cwd()

    const [, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

    const commandsDir = join(cwd, config.commands ?? 'commands')

    if (!(await fs.exists(commandsDir))) {
      return ctx.fail(`Commands directory not found: ${commandsDir}`)
    }

    ctx.status.spinner.start('Scanning commands...')

    const commandMap = await autoload({ dir: commandsDir })
    const tree = await buildTree(commandMap)

    ctx.status.spinner.stop('Commands')

    if (tree.length === 0) {
      ctx.log.raw('No commands found')
      return
    }

    ctx.log.raw(renderTree(tree))
  },
})

export default commandsCommand

// ---------------------------------------------------------------------------

/**
 * Resolve a command's subcommands field, which may be a Promise, a map, or undefined.
 *
 * @private
 * @param commands - The raw subcommands value from a Command object.
 * @returns The resolved CommandMap, or an empty object when none exist.
 */
async function resolveSubcommands(
  commands: Record<string, MalttyCommand> | Promise<Record<string, MalttyCommand>> | undefined
): Promise<Record<string, MalttyCommand>> {
  if (!commands) {
    return {}
  }

  if (commands instanceof Promise) {
    return commands
  }

  return commands
}

/**
 * Recursively build a sorted tree of entries from a CommandMap.
 *
 * Commands listed in the order array appear first in the specified order;
 * omitted commands fall back to alphabetical sort.
 *
 * @private
 * @param commandMap - The map of command names to Command objects.
 * @param order - Optional array of command names defining display order.
 * @returns A sorted array of TreeEntry nodes.
 */
async function buildTree(
  commandMap: Record<string, MalttyCommand>,
  order?: readonly string[]
): Promise<readonly TreeEntry[]> {
  const entries = sortEntries({ entries: Object.entries(commandMap), order })

  return Promise.all(
    entries.map(async ([name, cmd]): Promise<TreeEntry> => {
      const subMap = await resolveSubcommands(cmd.commands)
      const children = await buildTree(subMap, cmd.help?.order)

      return {
        children,
        description: cmd.description ?? '',
        name,
      }
    })
  )
}

/**
 * Sort command entries with ordered names first (in specified order),
 * remaining names alphabetically.
 *
 * Validates the order array against available command names and logs a
 * warning for unknown or duplicate entries rather than failing silently.
 *
 * @private
 * @param params - The command entries and optional order array.
 * @returns Sorted array of entries.
 */
function sortEntries(params: {
  readonly entries: [string, MalttyCommand][]
  readonly order?: readonly string[]
}): [string, MalttyCommand][] {
  const { entries, order } = params

  if (!order || order.length === 0) {
    return entries.toSorted(([a], [b]) => a.localeCompare(b))
  }

  const commandNames = entries.map(([name]) => name)
  const validOrder = validateOrder({ commandNames, order })

  const entryMap = new Map(entries)
  const orderedSet = new Set(validOrder)

  const ordered = validOrder
    .filter((name) => entryMap.has(name))
    .map((name): [string, MalttyCommand] => [name, entryMap.get(name) as MalttyCommand])

  const remaining = entries
    .filter(([name]) => !orderedSet.has(name))
    .toSorted(([a], [b]) => a.localeCompare(b))

  return [...ordered, ...remaining]
}

/**
 * Validate the order array by filtering out unknown and duplicate names.
 *
 * Logs warnings for invalid entries so developers see the mismatch
 * during `maltty commands` introspection, matching the runtime behaviour.
 *
 * @private
 * @param params - The order array and available command names.
 * @returns A deduplicated array of valid order names.
 */
function validateOrder(params: {
  readonly commandNames: readonly string[]
  readonly order: readonly string[]
}): readonly string[] {
  const { commandNames, order } = params
  const nameSet = new Set(commandNames)

  const { valid } = order.reduce<{
    readonly seen: ReadonlySet<string>
    readonly valid: readonly string[]
  }>(
    (acc, name) => {
      if (acc.seen.has(name)) {
        console.warn(`Warning: duplicate command name "${name}" in order array`)
        return acc
      }

      if (!nameSet.has(name)) {
        console.warn(`Warning: unknown command "${name}" in order array`)
        return { seen: new Set([...acc.seen, name]), valid: acc.valid }
      }

      return { seen: new Set([...acc.seen, name]), valid: [...acc.valid, name] }
    },
    { seen: new Set<string>(), valid: [] }
  )

  return valid
}

/**
 * Render a tree of entries into an ASCII tree string.
 *
 * @private
 * @param entries - The top-level tree entries to render.
 * @returns The formatted tree string.
 */
function renderTree(entries: readonly TreeEntry[]): string {
  return renderEntries(entries, '').join('\n')
}

/**
 * Recursively render tree entries with proper box-drawing connectors.
 *
 * @private
 * @param entries - The entries at this level.
 * @param prefix - The prefix string for indentation.
 * @returns An array of formatted lines.
 */
function renderEntries(entries: readonly TreeEntry[], prefix: string): readonly string[] {
  return entries.flatMap((entry, index) => {
    const isLast = index === entries.length - 1
    const connector = resolveConnector(isLast)
    const childPrefix = resolveChildPrefix(isLast)
    const label = formatLabel(entry.name, entry.description)
    const line = `${prefix}${connector}${label}`
    const childLines = renderEntries(entry.children, `${prefix}${childPrefix}`)

    return [line, ...childLines]
  })
}

/**
 * Get the box-drawing connector for a tree entry.
 *
 * @private
 * @param isLast - Whether this is the last entry at its level.
 * @returns The connector string.
 */
function resolveConnector(isLast: boolean): string {
  if (isLast) {
    return '└── '
  }

  return '├── '
}

/**
 * Get the indentation prefix for children of a tree entry.
 *
 * @private
 * @param isLast - Whether the parent is the last entry at its level.
 * @returns The child prefix string.
 */
function resolveChildPrefix(isLast: boolean): string {
  if (isLast) {
    return '    '
  }

  return '│   '
}

/**
 * Format a command name and description into a tree label.
 *
 * @private
 * @param name - The command name.
 * @param description - The command description (may be empty).
 * @returns The formatted label string.
 */
function formatLabel(name: string, description: string): string {
  if (description) {
    return `${name} — ${description}`
  }

  return name
}
