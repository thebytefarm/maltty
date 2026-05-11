import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { attempt } from 'es-toolkit'
import { match } from 'ts-pattern'

/**
 * Supported cross-compilation targets for sidecar binaries.
 *
 * Mirrors the `CompileTarget` union exported from `@kidd-cli/config`. Defined
 * locally here to avoid a circular dependency between `@kidd-cli/utils` and
 * `@kidd-cli/config` (config already depends on utils). Both sources must stay
 * in sync — see `packages/config/src/utils/compile.ts` for the canonical list.
 */
export type CompileTarget =
  | 'darwin-arm64'
  | 'darwin-x64'
  | 'linux-arm64'
  | 'linux-x64'
  | 'linux-x64-musl'
  | 'windows-arm64'
  | 'windows-x64'

/**
 * Map from Node.js `process.platform` values to compile-target OS prefixes.
 *
 * Frozen at module load. Callers should treat this as readonly.
 *
 * @example
 * ```ts
 * const os = PLATFORM_MAP[process.platform]
 * // 'darwin' on macOS, 'linux' on Linux, 'windows' on Windows
 * ```
 */
export const PLATFORM_MAP: Readonly<Record<NodeJS.Platform, string>> = {
  aix: 'aix',
  android: 'android',
  cygwin: 'windows',
  darwin: 'darwin',
  freebsd: 'freebsd',
  haiku: 'haiku',
  linux: 'linux',
  netbsd: 'netbsd',
  openbsd: 'openbsd',
  sunos: 'sunos',
  win32: 'windows',
}

/**
 * Map from Node.js `process.arch` values to compile-target architecture suffixes.
 *
 * Frozen at module load. Callers should treat this as readonly.
 *
 * @example
 * ```ts
 * const arch = ARCH_MAP[process.arch]
 * // 'arm64' on Apple Silicon, 'x64' on Intel
 * ```
 */
export const ARCH_MAP: Readonly<Record<string, string>> = {
  arm64: 'arm64',
  x64: 'x64',
}

/**
 * Detect the host platform and return its compile-target triple.
 *
 * Combines `process.platform` and `process.arch` into a {@link CompileTarget}
 * such as `darwin-arm64`. On Linux x64, also probes `/etc/os-release` for the
 * `ID=alpine` marker — Alpine ships musl libc, which requires a separate
 * `linux-x64-musl` binary. Any read or parse failure falls back to
 * `linux-x64` (glibc).
 *
 * Unknown platform/arch combinations fall back to `linux-x64`. Callers
 * targeting non-canonical hosts should validate before launching a sidecar.
 *
 * @returns The {@link CompileTarget} matching the current host.
 * @example
 * ```ts
 * const target = getPlatformTriple()
 * // 'darwin-arm64' on Apple Silicon macOS
 * // 'linux-x64-musl' on Alpine Linux
 * ```
 */
export function getPlatformTriple(): CompileTarget {
  const os = PLATFORM_MAP[process.platform] ?? process.platform
  const arch = ARCH_MAP[process.arch] ?? process.arch

  return match([os, arch] as const)
    .returnType<CompileTarget>()
    .with(['darwin', 'arm64'], () => 'darwin-arm64')
    .with(['darwin', 'x64'], () => 'darwin-x64')
    .with(['linux', 'arm64'], () => 'linux-arm64')
    .with(['linux', 'x64'], () =>
      match(isMuslLinux())
        .returnType<CompileTarget>()
        .with(true, () => 'linux-x64-musl')
        .with(false, () => 'linux-x64')
        .exhaustive()
    )
    .with(['windows', 'arm64'], () => 'windows-arm64')
    .with(['windows', 'x64'], () => 'windows-x64')
    .otherwise(() => 'linux-x64')
}

/**
 * Resolve the absolute directory that holds a sidecar binary for the host.
 *
 * Given the path of an executable, returns its sibling
 * `platforms/<os>-<arch>/` directory. Uses `path.join` so the separator is
 * native (forward slashes on POSIX, backslashes on Windows) and never
 * hardcoded.
 *
 * @param execPath - Absolute path to the calling executable.
 * @returns The absolute path of the per-platform binary directory.
 * @example
 * ```ts
 * // POSIX, on darwin-arm64:
 * getPlatformDir('/usr/local/bin/my-cli')
 * // → '/usr/local/bin/platforms/darwin-arm64'
 * ```
 */
export function getPlatformDir(execPath: string): string {
  return join(dirname(execPath), 'platforms', getPlatformTriple())
}

/**
 * Append the platform-specific executable extension to a binary name.
 *
 * On Windows, executables require a `.exe` suffix; on POSIX systems they
 * have no extension. Pass an unsuffixed base name and let this helper add
 * the extension if needed.
 *
 * @param name - Base binary name without extension.
 * @returns The name with `.exe` appended on Windows, unchanged elsewhere.
 * @example
 * ```ts
 * binName('rg') // 'rg' on POSIX, 'rg.exe' on Windows
 * ```
 */
export function binName(name: string): string {
  return `${name}${binExt()}`
}

/**
 * Return the platform-specific executable extension.
 *
 * `.exe` on Windows, an empty string on every other platform.
 *
 * @returns `.exe` on Windows, `''` elsewhere.
 * @example
 * ```ts
 * const suffix = binExt() // '.exe' on Windows
 * ```
 */
export function binExt(): '.exe' | '' {
  return match(isWindows())
    .returnType<'.exe' | ''>()
    .with(true, () => '.exe')
    .with(false, () => '')
    .exhaustive()
}

/**
 * Whether the host is Windows.
 *
 * Tracks both `win32` and `cygwin` values of `process.platform`.
 *
 * @returns `true` when running on Windows.
 * @example
 * ```ts
 * if (isWindows()) {
 *   // …
 * }
 * ```
 */
export function isWindows(): boolean {
  return process.platform === 'win32' || process.platform === 'cygwin'
}

/**
 * Whether the host is macOS.
 *
 * @returns `true` when `process.platform === 'darwin'`.
 * @example
 * ```ts
 * if (isMacOS()) {
 *   // …
 * }
 * ```
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin'
}

/**
 * Whether the host is Linux.
 *
 * @returns `true` when `process.platform === 'linux'`.
 * @example
 * ```ts
 * if (isLinux()) {
 *   // …
 * }
 * ```
 */
export function isLinux(): boolean {
  return process.platform === 'linux'
}

// ---------------------------------------------------------------------------

/**
 * Detect whether the running Linux distribution uses musl libc.
 *
 * Reads `/etc/os-release` and looks for `ID=alpine` (the canonical musl
 * distribution). Any read or parse failure resolves to `false` — callers
 * should default to glibc when uncertain.
 *
 * @private
 * @returns `true` when the host appears to be Alpine Linux.
 */
function isMuslLinux(): boolean {
  const [error, contents] = attempt<string, Error>(() => readFileSync('/etc/os-release', 'utf8'))
  if (error || contents === null) {
    return false
  }
  return /^ID=alpine\s*$/m.test(contents)
}
