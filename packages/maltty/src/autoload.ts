import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

import { isPlainObject, isString } from '@maltty/utils/fp'
import { path as pathUtils } from '@maltty/utils/node'
import { hasTag, withTag } from '@maltty/utils/tag'
import { match } from 'ts-pattern'

import { INDEX_COMMAND_NAME } from './constants.js'
import { isDebug } from './lib/debug.js'
import type { AutoloadOptions, Command, CommandMap } from './types/index.js'

const VALID_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx'])

/**
 * Scan a directory for command files and produce a CommandMap.
 *
 * An `index` file at the root of the scanned directory becomes the CLI's default
 * command — it runs when no subcommand matches. This mirrors how an `index` file
 * inside a subdirectory becomes that group's parent command. The default command
 * keeps its explicit `name` when it declares one, so both `mycli` and
 * `mycli <name>` dispatch to it; otherwise it is reachable only as the default.
 *
 * @param options - Autoload configuration (directory override, etc.).
 * @returns A promise resolving to a CommandMap built from the directory tree.
 */
export async function autoload(options?: AutoloadOptions): Promise<CommandMap> {
  const dir = resolveDir(options)
  const entries = await readdir(dir, { withFileTypes: true })
  const [commands, defaultPairs] = await Promise.all([
    resolveCommandMapFromEntries(dir, entries),
    resolveRootDefaultCommands({ dir, entries }),
  ])

  if (defaultPairs.length === 0) {
    return commands
  }

  return Object.fromEntries(deduplicateCommandPairs([...defaultPairs, ...Object.entries(commands)]))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the target directory from autoload options.
 *
 * @private
 * @param options - Optional autoload configuration.
 * @returns The resolved absolute directory path.
 */
function resolveDir(options?: AutoloadOptions): string {
  if (options && isString(options.dir)) {
    return resolve(options.dir)
  }
  return resolve('./commands')
}

/**
 * Resolve every root `index` file into a default command entry.
 *
 * Each command is keyed by its explicit `name` when it declares one — keeping the
 * named invocation form available alongside the default — and by the reserved
 * index name otherwise, which registers it with no name of its own.
 *
 * A directory can hold more than one index file across the supported extensions.
 * All of them are resolved so a genuine conflict reaches registration as a
 * multiple-default error rather than being decided by directory order.
 *
 * @private
 * @param params - The scanned directory and its pre-read entries.
 * @returns The resolved [name, Command] tuples, empty when there is no root index command.
 */
async function resolveRootDefaultCommands(params: {
  readonly dir: string
  readonly entries: Dirent[]
}): Promise<readonly (readonly [string, Command])[]> {
  const { dir, entries } = params

  const pairs = await Promise.all(
    findIndexEntries(entries).map(
      async (entry): Promise<readonly [string, Command] | undefined> => {
        const cmd = await importCommand(join(dir, entry.name))
        if (!cmd) {
          return undefined
        }
        return [cmd.name ?? INDEX_COMMAND_NAME, withTag({ ...cmd, default: true }, 'Command')]
      }
    )
  )

  return pairs.filter((pair): pair is readonly [string, Command] => pair !== undefined)
}

/**
 * Scan a subdirectory and assemble it as a parent command with subcommands.
 *
 * If the directory contains an `index.ts`/`index.js`, that becomes the parent
 * handler. Otherwise a handler-less group command is created that demands a
 * subcommand.
 *
 * @private
 * @param dir - Absolute path to the subdirectory.
 * @returns A tuple of [name, Command] or undefined if the directory is empty.
 */
async function resolveDirCommand(dir: string): Promise<[string, Command] | undefined> {
  const dirName = basename(dir)
  const dirEntries = await readdir(dir, { withFileTypes: true })
  const subCommands = await resolveCommandMapFromEntries(dir, dirEntries)
  const indexFiles = findIndexEntries(dirEntries)
  const [indexFile] = indexFiles

  if (indexFile) {
    if (indexFiles.length > 1) {
      console.warn(
        `[maltty] multiple index files in "${dirName}" (${indexFiles.map((entry) => entry.name).join(', ')}) — a group has one parent handler, so "${indexFile.name}" wins`
      )
    }

    const parentCommand = await importCommand(join(dir, indexFile.name))
    if (parentCommand) {
      const name = parentCommand.name ?? dirName
      return [name, withTag({ ...parentCommand, commands: subCommands }, 'Command')]
    }
  }

  if (Object.keys(subCommands).length === 0) {
    return undefined
  }

  return [dirName, withTag({ commands: subCommands }, 'Command')]
}

/**
 * Build a CommandMap from pre-read directory entries.
 *
 * Shared by both `autoload` and `resolveDirCommand` to avoid duplicating
 * the file/dir fan-out and result-filtering logic.
 *
 * @private
 * @param dir - Absolute path to the directory the entries belong to.
 * @param entries - Pre-read directory entries for that directory.
 * @returns A CommandMap built from the entries.
 */
async function resolveCommandMapFromEntries(dir: string, entries: Dirent[]): Promise<CommandMap> {
  const fileEntries = entries.filter(isCommandFile)
  const dirEntries = entries.filter(isCommandDir)

  const fileResults = await Promise.all(
    fileEntries.map(async (entry): Promise<[string, Command] | undefined> => {
      const cmd = await importCommand(join(dir, entry.name))
      if (!cmd) {
        return undefined
      }
      const name = cmd.name ?? deriveCommandName(entry)
      return [name, cmd]
    })
  )

  const dirResults = await Promise.all(
    dirEntries.map((entry) => resolveDirCommand(join(dir, entry.name)))
  )

  const allResults = [...fileResults, ...dirResults]
  const validPairs = allResults.filter((pair): pair is [string, Command] => pair !== undefined)

  return Object.fromEntries(deduplicateCommandPairs(validPairs))
}

/**
 * Find every index file (`index.ts`, `index.js`, ...) in pre-read directory entries.
 *
 * Results are sorted by filename so callers that can only use one candidate pick
 * the same file on every platform, regardless of directory read order.
 *
 * @private
 * @param entries - Pre-read directory entries.
 * @returns The index files' Dirents, sorted by name.
 */
function findIndexEntries(entries: Dirent[]): readonly Dirent[] {
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.d.tsx') &&
        VALID_EXTENSIONS.has(extname(entry.name)) &&
        basename(entry.name, extname(entry.name)) === INDEX_COMMAND_NAME
    )
    .toSorted((a, b) => a.name.localeCompare(b.name))
}

/**
 * Dynamically import a file and validate that its default export is a Command.
 *
 * Converts the absolute filesystem path to a `file://` URL before passing to
 * `import()` so resolution works on Windows (where backslash paths are not
 * valid ESM specifiers).
 *
 * @private
 * @param filePath - Absolute path to the file to import.
 * @returns The Command if valid, or undefined.
 */
async function importCommand(filePath: string): Promise<Command | undefined> {
  const specifier = pathUtils.toImportUrl(filePath)
  try {
    const mod: unknown = await import(specifier)
    if (isCommandExport(mod)) {
      return mod.default
    }
    return undefined
  } catch (error: unknown) {
    if (isDebug()) {
      console.warn(`[maltty] failed to import command from ${specifier}:`, error)
    }
    return undefined
  }
}

/**
 * Check whether a module's default export is a Command object.
 *
 * ES module namespace objects have a null prototype, so isPlainObject
 * rejects them. We only need to verify the namespace is a non-null
 * object with a default export that is a plain Command object.
 *
 * @private
 * @param mod - The imported module to inspect.
 * @returns True when the module has a Command as its default export.
 */
function isCommandExport(mod: unknown): mod is { default: Command } {
  return match(mod)
    .when(
      (value): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && Object.hasOwn(value as object, 'default'),
      (value) => {
        const def: unknown = value.default
        return isPlainObject(def) && hasTag(def, 'Command')
      }
    )
    .otherwise(() => false)
}

/**
 * Derive a command name from a directory entry by stripping its extension.
 *
 * @private
 * @param entry - The directory entry to derive the name from.
 * @returns The file name without its extension.
 */
function deriveCommandName(entry: Dirent): string {
  return basename(entry.name, extname(entry.name))
}

/**
 * Predicate: entry is a command file (.ts/.js, not index, not _/. prefixed).
 *
 * @private
 * @param entry - The directory entry to check.
 * @returns True when the entry is a valid command file.
 */
function isCommandFile(entry: Dirent): boolean {
  if (!entry.isFile()) {
    return false
  }
  if (entry.name.startsWith('_') || entry.name.startsWith('.')) {
    return false
  }
  if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.tsx')) {
    return false
  }
  if (!VALID_EXTENSIONS.has(extname(entry.name))) {
    return false
  }
  return deriveCommandName(entry) !== INDEX_COMMAND_NAME
}

/**
 * Predicate: entry is a scannable command directory (not _/. prefixed).
 *
 * @private
 * @param entry - The directory entry to check.
 * @returns True when the entry is a valid command directory.
 */
function isCommandDir(entry: Dirent): boolean {
  if (!entry.isDirectory()) {
    return false
  }
  return !entry.name.startsWith('_') && !entry.name.startsWith('.')
}

/**
 * Deduplicate command pairs by name, keeping the first occurrence.
 *
 * When multiple commands resolve to the same name (e.g. via explicit `name`
 * overrides), this ensures a deterministic first-wins policy and emits a
 * warning for every collision so the user can fix the conflict.
 *
 * @private
 * @param pairs - The resolved [name, Command] tuples.
 * @returns Deduplicated pairs with only the first occurrence of each name.
 */
function deduplicateCommandPairs(
  pairs: readonly (readonly [string, Command])[]
): readonly (readonly [string, Command])[] {
  const { result } = pairs.reduce<{
    readonly seen: ReadonlyMap<string, Command>
    readonly result: readonly (readonly [string, Command])[]
  }>(
    (acc, pair) => {
      const [name, cmd] = pair
      const kept = acc.seen.get(name)
      if (kept) {
        console.warn(formatDuplicateWarning({ dropped: cmd, kept, name }))
        return acc
      }
      return {
        result: [...acc.result, pair],
        seen: new Map([...acc.seen, [name, cmd] as const]),
      }
    },
    { result: [], seen: new Map<string, Command>() }
  )

  return result
}

/**
 * Build the warning emitted when two commands resolve to the same name.
 *
 * Registration rejects multiple defaults at one level, but that check only sees
 * the deduplicated map — two commands that are both marked default and collapse
 * to a single name never reach it. The collision is called out here instead, so
 * the discarded default is reported rather than silently dropped.
 *
 * @private
 * @param params - The colliding name, the command kept, and the command dropped.
 * @returns The warning message.
 */
function formatDuplicateWarning(params: {
  readonly dropped: Command
  readonly kept: Command
  readonly name: string
}): string {
  const { dropped, kept, name } = params
  const prefix = `[maltty] duplicate command name "${name}"`

  return match(kept.default === true && dropped.default === true)
    .with(
      true,
      () =>
        `${prefix} — both definitions are marked default. First definition wins, later definition ignored.`
    )
    .otherwise(() => `${prefix} — first definition wins, later definition ignored`)
}
