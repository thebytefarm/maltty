/**
 * List installed system font file paths by scanning platform-specific directories.
 *
 * Pure JavaScript implementation with no native dependencies. Scans well-known
 * font directories per OS and returns file paths matching common font extensions.
 *
 * Directory layout based on `get-system-fonts` (https://github.com/princjef/get-system-fonts)
 * with updates for modern OS versions.
 */

import { lstat, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { err, ok } from '@maltty/utils/fp'
import type { ResultAsync } from '@maltty/utils/fp'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Font file extensions to include when scanning directories.
 *
 * @private
 */
const FONT_EXTENSIONS: ReadonlySet<string> = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2'])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List installed system font file paths by scanning platform-specific directories.
 *
 * Scans well-known font directories and returns absolute paths for all font
 * files found. Directories that do not exist are silently skipped.
 *
 * - **macOS**: `~/Library/Fonts`, `/Library/Fonts`, `/System/Library/Fonts`,
 *   `/System/Library/Fonts/Supplemental`, `/Network/Library/Fonts`
 * - **Linux**: `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`,
 *   `~/.local/share/fonts`
 * - **Windows**: `%WINDIR%\Fonts`, `%LOCALAPPDATA%\Microsoft\Windows\Fonts`
 *
 * @returns A Result tuple with font file paths on success, or an Error on failure.
 */
export async function listSystemFonts(): ResultAsync<readonly string[]> {
  const dirs = getFontDirectories()

  try {
    const nested = await Promise.all(dirs.map(scanDirectory))
    const fonts = nested.flat()

    return ok(fonts)
  } catch (error) {
    if (error instanceof Error) {
      return err(error)
    }

    return err(new Error(String(error)))
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Get the platform-specific font directories to scan.
 *
 * @private
 * @returns An array of absolute directory paths.
 */
function getFontDirectories(): readonly string[] {
  const home = homedir()

  return match(process.platform)
    .with('darwin', () => [
      join(home, 'Library', 'Fonts'),
      '/Library/Fonts',
      '/System/Library/Fonts',
      '/System/Library/Fonts/Supplemental',
      '/Network/Library/Fonts',
    ])
    .with('linux', () => [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      join(home, '.fonts'),
      join(home, '.local', 'share', 'fonts'),
    ])
    .with('win32', () => {
      const winDir = process.env['WINDIR'] ?? String.raw`C:\Windows`
      const localAppData = process.env['LOCALAPPDATA'] ?? join(home, 'AppData', 'Local')

      return [join(winDir, 'Fonts'), join(localAppData, 'Microsoft', 'Windows', 'Fonts')]
    })
    .otherwise(() => [])
}

/**
 * Recursively scan a directory for font files.
 *
 * Returns an empty array if the directory does not exist or is unreadable.
 *
 * @private
 * @param dir - The absolute directory path to scan.
 * @returns An array of absolute font file paths.
 */
async function scanDirectory(dir: string): Promise<readonly string[]> {
  const entries = await safeReaddir(dir)

  if (entries.length === 0) {
    return []
  }

  const results = await Promise.all(entries.map((entry) => processEntry(join(dir, entry))))

  return results.flat()
}

/**
 * Process a single directory entry, recursing into subdirectories.
 *
 * Uses `lstat` instead of `stat` to avoid following symbolic links, which
 * prevents infinite loops from cyclic symlinks in font directories.
 *
 * @private
 * @param fullPath - The absolute path to the entry.
 * @returns Font file paths found at or below this entry.
 */
async function processEntry(fullPath: string): Promise<readonly string[]> {
  const info = await safeLstat(fullPath)

  if (info === null || info.isSymbolicLink()) {
    return []
  }

  if (info.isDirectory()) {
    return scanDirectory(fullPath)
  }

  if (info.isFile() && isFontFile(fullPath)) {
    return [fullPath]
  }

  return []
}

/**
 * Check whether a file path has a recognized font extension.
 *
 * @private
 * @param filePath - The file path to check.
 * @returns True if the file has a font extension.
 */
function isFontFile(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf('.')

  if (dotIndex === -1) {
    return false
  }

  return FONT_EXTENSIONS.has(filePath.slice(dotIndex).toLowerCase())
}

/**
 * Read a directory's entries, returning an empty array on failure.
 *
 * @private
 * @param dir - The directory to read.
 * @returns An array of entry names, or empty on error.
 */
async function safeReaddir(dir: string): Promise<readonly string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

/**
 * Lstat a path, returning null on failure.
 *
 * Uses `lstat` (not `stat`) so symlinks are reported as symlinks
 * rather than being followed — preventing infinite recursion from
 * cyclic symlinks in font directories.
 *
 * @private
 * @param filePath - The path to lstat.
 * @returns The lstat result, or null on error.
 */
async function safeLstat(
  filePath: string
): Promise<ReturnType<typeof lstat> extends Promise<infer T> ? T | null : never> {
  try {
    return await lstat(filePath)
  } catch {
    return null
  }
}
