import { path } from '@kidd-cli/utils/node'

import type { ScanResult, ScannedDir, ScannedFile } from '../types.js'

/**
 * Parameters for generating a static autoloader module.
 */
interface GenerateStaticAutoloaderParams {
  readonly scan: ScanResult
  readonly tagModulePath: string
}

/**
 * The two parts of a static autoloader transform: import statements to
 * prepend and the replacement code for the autoloader region.
 */
export interface StaticAutoloaderParts {
  readonly imports: string
  readonly region: string
}

/**
 * Generate JavaScript source code for a static autoloader virtual module.
 *
 * The generated module statically imports every discovered command file and
 * exports an `autoload()` function that returns the pre-built CommandMap.
 * Directory commands that merge a parent handler with subcommands are re-tagged
 * via `withTag` because the TAG symbol is non-enumerable and lost on spread.
 *
 * @param params - The scan result and path to the tag utility module.
 * @returns JavaScript source code for the static autoloader.
 */
export function generateStaticAutoloader(params: GenerateStaticAutoloaderParams): string {
  const imports = collectImports(params.scan)
  const importLines = buildImportStatements(imports, params.tagModulePath)
  const commandsObject = buildCommandsObject(params.scan)

  return [
    ...importLines,
    '',
    `const commands = ${commandsObject}`,
    '',
    'export async function autoload() {',
    '  return commands',
    '}',
    '',
  ].join('\n')
}

/**
 * Generate the two parts needed to transform kidd's bundled dist.
 *
 * Returns an empty imports string (no prepended imports needed) and a
 * replacement autoloader region that uses dynamic `import()` calls inside
 * the async `autoload()` function. This avoids circular dependency issues:
 * command files import `command` from `@kidd-cli/core`, so static imports would be
 * hoisted above kidd's own initialization code, causing `TAG` to be
 * accessed before initialization.
 *
 * By deferring to dynamic imports, kidd fully initializes first, then
 * command files are loaded when `autoload()` is called at CLI startup.
 *
 * @param params - The scan result and path to the tag utility module.
 * @returns Import statements (empty) and the replacement autoloader region.
 */
export function generateAutoloaderParts(
  params: GenerateStaticAutoloaderParams
): StaticAutoloaderParts {
  const imports = collectImports(params.scan)

  if (imports.length === 0) {
    return {
      imports: '',
      region: buildEmptyAutoloaderRegion(),
    }
  }

  const commandsObject = buildCommandsObject(params.scan)
  const region = buildDynamicAutoloaderRegion(imports, commandsObject)

  return { imports: '', region }
}

// ---------------------------------------------------------------------------

/**
 * A collected import entry with its identifier and absolute file path.
 *
 * @private
 */
interface ImportEntry {
  readonly identifier: string
  readonly filePath: string
}

/**
 * Collect all import entries from a scan result.
 *
 * @private
 * @param scan - The scan result to collect imports from.
 * @returns A flat array of all import entries.
 */
function collectImports(scan: ScanResult): readonly ImportEntry[] {
  return [
    ...scan.files.map((file) => fileToImport(file, [])),
    ...scan.dirs.flatMap((dir) => collectDirImports(dir, [])),
  ]
}

/**
 * Recursively collect import entries from a scanned directory.
 *
 * @private
 * @param dir - The scanned directory.
 * @param parentPath - The path segments leading to this directory.
 * @returns A flat array of import entries for the directory and its children.
 */
function collectDirImports(dir: ScannedDir, parentPath: readonly string[]): readonly ImportEntry[] {
  const currentPath = [...parentPath, dir.name]
  const indexImport: readonly ImportEntry[] = buildIndexImport(dir.index, currentPath)

  return [
    ...indexImport,
    ...dir.files.map((file) => fileToImport(file, currentPath)),
    ...dir.dirs.flatMap((sub) => collectDirImports(sub, currentPath)),
  ]
}

/**
 * Create an import entry for a leaf command file.
 *
 * @private
 * @param file - The scanned file.
 * @param parentPath - The path segments leading to the file's parent directory.
 * @returns An import entry with a generated identifier.
 */
function fileToImport(file: ScannedFile, parentPath: readonly string[]): ImportEntry {
  return {
    filePath: file.filePath,
    identifier: toIdentifier([...parentPath, file.name]),
  }
}

/**
 * Convert a path segment array to a valid JavaScript identifier.
 *
 * Joins segments with underscores and prefixes with `_`.
 * Example: `['deploy', 'preview']` becomes `_deploy_preview`.
 *
 * @private
 * @param segments - The path segments to convert.
 * @returns A valid JavaScript identifier string.
 */
function toIdentifier(segments: readonly string[]): string {
  return `_${segments.map((s) => s.replaceAll('-', '$')).join('_')}`
}

/**
 * Build the array of import statement lines.
 *
 * @private
 * @param imports - All collected import entries.
 * @param tagModulePath - Absolute path to the tag utility module.
 * @returns An array of import statement strings.
 */
function buildImportStatements(
  imports: readonly ImportEntry[],
  tagModulePath: string
): readonly string[] {
  const tagLine = buildTagImportLine(imports, tagModulePath)

  const importLines = imports.map(
    (entry) => `import ${entry.identifier} from '${path.toImportUrl(entry.filePath)}'`
  )

  return [...tagLine, '', ...importLines]
}

/**
 * Build the JavaScript object literal string for the top-level commands map.
 *
 * @private
 * @param scan - The scan result.
 * @returns A string representation of the commands object literal.
 */
function buildCommandsObject(scan: ScanResult): string {
  const entries = [
    ...scan.files.map((file) => buildFileEntry(file, [])),
    ...scan.dirs.map((dir) => buildDirEntry(dir, [])),
  ]

  return formatObject(entries)
}

/**
 * Build an object entry string for a leaf command file.
 *
 * @private
 * @param file - The scanned file.
 * @param parentPath - Path segments to the file's parent.
 * @returns A string like `'status': _status`.
 */
function buildFileEntry(file: ScannedFile, parentPath: readonly string[]): string {
  const identifier = toIdentifier([...parentPath, file.name])
  return `'${file.name}': ${identifier}`
}

/**
 * Build an object entry string for a directory command (possibly with subcommands).
 *
 * @private
 * @param dir - The scanned directory.
 * @param parentPath - Path segments to the directory's parent.
 * @returns A string representing the directory command with withTag wrapping.
 */
function buildDirEntry(dir: ScannedDir, parentPath: readonly string[]): string {
  const currentPath = [...parentPath, dir.name]
  const subEntries = [
    ...dir.files.map((file) => buildFileEntry(file, currentPath)),
    ...dir.dirs.map((sub) => buildDirEntry(sub, currentPath)),
  ]
  const commandsObj = formatObject(subEntries)

  if (dir.index) {
    const indexIdentifier = toIdentifier(currentPath)

    return `'${dir.name}': withTag({ ...${indexIdentifier}, commands: ${commandsObj} }, 'Command')`
  }

  return `'${dir.name}': withTag({ commands: ${commandsObj} }, 'Command')`
}

/**
 * Build the import entry for an index file, if present.
 *
 * @private
 * @param index - The absolute path to the index file, or undefined.
 * @param currentPath - The current path segments for identifier generation.
 * @returns An array with zero or one import entries.
 */
function buildIndexImport(
  index: string | undefined,
  currentPath: readonly string[]
): readonly ImportEntry[] {
  if (!index) {
    return []
  }
  return [{ filePath: index, identifier: toIdentifier(currentPath) }]
}

/**
 * Build the tag import line if any imports exist.
 *
 * @private
 * @param imports - The collected import entries.
 * @param tagModulePath - The absolute path to the tag module.
 * @returns An array with zero or one import statement strings.
 */
function buildTagImportLine(
  imports: readonly ImportEntry[],
  tagModulePath: string
): readonly string[] {
  if (imports.length === 0) {
    return []
  }
  return [`import { withTag } from '${path.toImportUrl(tagModulePath)}'`]
}

/**
 * Build the autoloader region for an empty scan result.
 *
 * @private
 * @returns A region string with an autoloader that returns an empty object.
 */
function buildEmptyAutoloaderRegion(): string {
  return [
    '//#region src/autoload.ts (static)',
    'async function autoload() {',
    '  return {}',
    '}',
    '//#endregion',
  ].join('\n')
}

/**
 * Build the autoloader region using dynamic `import()` calls.
 *
 * Uses `Promise.all` with array destructuring to load all command files
 * in parallel. The dynamic imports defer execution until `autoload()` is
 * called, avoiding circular dependency issues with kidd's own initialization.
 *
 * @private
 * @param imports - The collected import entries.
 * @param commandsObject - The commands object literal string.
 * @returns A region string with the full dynamic autoloader.
 */
function buildDynamicAutoloaderRegion(
  imports: readonly ImportEntry[],
  commandsObject: string
): string {
  const destructuring = imports.map((entry) => `    { default: ${entry.identifier} },`).join('\n')

  const importCalls = imports
    .map((entry) => `    import('${path.toImportUrl(entry.filePath)}'),`)
    .join('\n')

  return [
    '//#region src/autoload.ts (static)',
    'async function autoload() {',
    '  const [',
    destructuring,
    '  ] = await Promise.all([',
    importCalls,
    '  ])',
    `  return ${commandsObject}`,
    '}',
    '//#endregion',
  ].join('\n')
}

/**
 * Format an array of key-value strings as a JavaScript object literal.
 *
 * @private
 * @param entries - The key-value pair strings.
 * @returns A formatted object literal string.
 */
function formatObject(entries: readonly string[]): string {
  if (entries.length === 0) {
    return '{}'
  }

  const body = entries.map((entry) => `  ${entry},`).join('\n')
  return `{\n${body}\n}`
}
