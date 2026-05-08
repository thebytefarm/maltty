import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

import { isPlainObject, isString } from '@kidd-cli/utils/fp'
import { path as pathUtils } from '@kidd-cli/utils/node'
import { hasTag, withTag } from '@kidd-cli/utils/tag'
import { match } from 'ts-pattern'

import { isDebug } from './lib/debug.js'
import type { AutoloadOptions, Command, CommandMap } from './types/index.js'

const VALID_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx'])
const INDEX_NAME = 'index'

/**
 * Scan a directory for command files and produce a CommandMap.
 *
 * @param options - Autoload configuration (directory override, etc.).
 * @returns A promise resolving to a CommandMap built from the directory tree.
 */
export async function autoload(options?: AutoloadOptions): Promise<CommandMap> {
  const dir = resolveDir(options)
  const entries = await readdir(dir, { withFileTypes: true })
  return resolveCommandMapFromEntries(dir, entries)
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
  const indexFile = findIndexInEntries(dirEntries)

  if (indexFile) {
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
 * Find the index file (index.ts or index.js) in pre-read directory entries.
 *
 * @private
 * @param entries - Pre-read directory entries.
 * @returns The index file's Dirent or undefined.
 */
function findIndexInEntries(entries: Dirent[]): Dirent | undefined {
  return entries.find(
    (entry) =>
      entry.isFile() &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.d.tsx') &&
      VALID_EXTENSIONS.has(extname(entry.name)) &&
      basename(entry.name, extname(entry.name)) === INDEX_NAME
  )
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
      console.warn(`[kidd] failed to import command from ${specifier}:`, error)
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
  return deriveCommandName(entry) !== INDEX_NAME
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
    readonly seen: ReadonlySet<string>
    readonly result: readonly (readonly [string, Command])[]
  }>(
    (acc, pair) => {
      const [name] = pair
      if (acc.seen.has(name)) {
        console.warn(
          `[kidd] duplicate command name "${name}" — first definition wins, later definition ignored`
        )
        return acc
      }
      return {
        result: [...acc.result, pair],
        seen: new Set([...acc.seen, name]),
      }
    },
    { result: [], seen: new Set<string>() }
  )

  return result
}
