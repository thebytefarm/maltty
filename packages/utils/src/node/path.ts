import { pathToFileURL } from 'node:url'

/**
 * Convert a filesystem path to an ESM import specifier (a `file://` URL).
 *
 * Required wherever a filesystem path becomes a JavaScript import string —
 * dynamic `import()` calls or static import specifiers embedded in generated
 * source code. On Windows, raw paths like `C:\foo\bar.ts` contain `\f`, `\b`,
 * `\u`, and other sequences that JavaScript parses as string escapes, which
 * either crashes the bundler or breaks runtime resolution. The `file://` URL
 * form is platform-neutral (`file:///C:/foo/bar.ts` on Windows,
 * `file:///foo/bar.ts` on POSIX).
 *
 * @param filePath - An absolute filesystem path.
 * @returns A `file://` URL string suitable as an ESM import specifier.
 */
export function toImportUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

/**
 * Normalize a native path string to use forward-slash separators.
 *
 * `path.relative()` and `path.join()` return separators native to the OS
 * (`\` on Windows, `/` elsewhere). When paths flow into string operations —
 * regex matching, `includes()` / `startsWith()` checks, template-engine
 * lookups — Windows backslashes silently break POSIX-shaped patterns.
 * Normalizing once at the boundary lets downstream code assume `/`.
 *
 * Node's `path.join()` accepts forward slashes on Windows and produces
 * correct native paths during filesystem operations, so the normalized form
 * remains usable for subsequent path composition.
 *
 * @param p - A native path string.
 * @returns The path with all `\` replaced by `/`.
 */
export function toPosixPath(p: string): string {
  return p.replaceAll('\\', '/')
}
