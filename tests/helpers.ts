import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const EXAMPLES_DIR = fileURLToPath(new URL('../examples', import.meta.url))

/**
 * Map from `process.platform` to compile target OS prefix.
 *
 * @private
 */
const PLATFORM_MAP: Readonly<Record<string, string>> = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows',
}

/**
 * Map from `process.arch` to compile target architecture suffix.
 *
 * @private
 */
const ARCH_MAP: Readonly<Record<string, string>> = {
  arm64: 'arm64',
  x64: 'x64',
}

/**
 * Resolve the host compile target string from the current platform and arch.
 *
 * @private
 * @returns A compile target string (e.g., `darwin-arm64`).
 */
function resolveHostTarget(): string {
  const os = PLATFORM_MAP[process.platform] ?? process.platform
  const arch = ARCH_MAP[process.arch] ?? process.arch
  return `${os}-${arch}`
}

/**
 * Resolve the platform-specific binary extension. Windows binaries end in
 * `.exe`; other platforms have no extension.
 *
 * @private
 * @returns The extension string (`.exe` on Windows, empty otherwise).
 */
function resolveBinaryExtension(): string {
  if (process.platform === 'win32') {
    return '.exe'
  }
  return ''
}

/**
 * Options for creating a node runner.
 */
interface NodeRunnerOptions {
  /**
   * The example directory name under `examples/`.
   */
  readonly example: string
  /**
   * Relative path to the built entry file (default: `dist/index.js`).
   */
  readonly distPath?: string
}

/**
 * A subprocess runner that spawns the built CLI as a child process.
 *
 * Best for integration tests that need full process isolation (exit codes,
 * env vars, real stdout).
 */
type SubprocessRunner = (...args: readonly string[]) => string

/**
 * Create a subprocess runner for a built example CLI.
 *
 * Spawns `node <distPath>` with the given arguments. Returns combined
 * stdout + stderr as a string, or throws on non-zero exit.
 *
 * @param options - Runner configuration.
 * @returns A function that runs the built CLI with the given arguments.
 */
export function createNodeRunner({
  example,
  distPath = 'dist/index.mjs',
}: NodeRunnerOptions): SubprocessRunner {
  const cwd = `${EXAMPLES_DIR}/${example}`

  return (...args: readonly string[]): string => {
    const result = spawnSync('node', [distPath, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
    })

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      throw new Error(`CLI exited with status ${String(result.status)}: ${result.stderr}`)
    }

    return `${result.stdout}${result.stderr}`
  }
}

/**
 * Options for creating a compiled binary runner.
 */
interface BinaryRunnerOptions {
  /**
   * The example directory name under `examples/`.
   */
  readonly example: string
  /**
   * Relative path to the dist directory (default: `dist`).
   */
  readonly distDir?: string
  /**
   * Binary base name (default: same as `example`).
   * The host target suffix is appended automatically.
   */
  readonly name?: string
}

/**
 * Create a subprocess runner for a compiled example binary.
 *
 * Executes the binary directly (not via `node`) with the given arguments.
 * Returns combined stdout + stderr as a string, or throws on non-zero exit.
 *
 * @param options - Runner configuration.
 * @returns A function that runs the compiled binary with the given arguments.
 */
export function createBinaryRunner({
  example,
  distDir = 'dist',
  name,
}: BinaryRunnerOptions): SubprocessRunner {
  const cwd = `${EXAMPLES_DIR}/${example}`
  const binaryName = name ?? example
  const binary = `${cwd}/${distDir}/${binaryName}-${resolveHostTarget()}${resolveBinaryExtension()}`

  return (...args: readonly string[]): string => {
    const result = spawnSync(binary, [...args], {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
    })

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      throw new Error(`Binary exited with status ${String(result.status)}: ${result.stderr}`)
    }

    return `${result.stdout}${result.stderr}`
  }
}
