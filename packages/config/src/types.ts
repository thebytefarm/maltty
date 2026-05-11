import type { CompileTarget } from './utils/compile.js'

/**
 * Source descriptor for a sidecar binary fetched from a GitHub release.
 *
 * Carries a `kind: 'github'` discriminator so {@link SidecarSource} can be
 * widened into a true union (e.g. with `'url'`, `'npm'`, `'s3'` variants)
 * in the future without breaking existing config files.
 *
 * @example
 * ```ts
 * const source: SidecarGithubSource = {
 *   kind: 'github',
 *   repo: 'astral-sh/ruff',
 *   asset: 'ruff-{version}-{triple}.tar.gz',
 * }
 * ```
 */
export interface SidecarGithubSource {
  /**
   * Discriminator identifying the source backend as a GitHub release.
   */
  readonly kind: 'github'
  /**
   * `owner/name` slug of the GitHub repository hosting the release.
   */
  readonly repo: string
  /**
   * Asset name template. Supports `{version}` and `{triple}` placeholders
   * that are interpolated per platform at resolution time.
   */
  readonly asset: string
}

/**
 * Source descriptor for a sidecar binary download.
 *
 * Modeled as a discriminated union keyed on `kind` so additional sources
 * (e.g. `'url'`, `'npm'`, `'s3'`) can be introduced in the future without
 * breaking existing config files. v1 only supports
 * {@link SidecarGithubSource}.
 *
 * @example
 * ```ts
 * const source: SidecarSource = {
 *   kind: 'github',
 *   repo: 'astral-sh/ruff',
 *   asset: 'ruff-{version}-{triple}.tar.gz',
 * }
 * ```
 */
export type SidecarSource = SidecarGithubSource

/**
 * Platform-specific mapping for a sidecar asset.
 *
 * Provided as a shorthand `string` (the platform triple, used to interpolate
 * the source's asset template) or an object form when a platform requires an
 * asset-name override that diverges from the default template.
 *
 * @example
 * ```ts
 * // Shorthand: triple only
 * const mac: SidecarPlatformMapping = 'aarch64-apple-darwin'
 *
 * // Object form: per-platform asset override
 * const win: SidecarPlatformMapping = {
 *   triple: 'x86_64-pc-windows-msvc',
 *   asset: 'tool-{version}-windows.zip',
 * }
 * ```
 */
export type SidecarPlatformMapping =
  | string
  | {
      /**
       * Target triple used to interpolate `{triple}` in the asset template.
       */
      readonly triple: string
      /**
       * Optional asset-name override for this platform. When provided, it
       * replaces the source's default `asset` template for this platform only.
       */
      readonly asset?: string
    }

/**
 * Optional integrity checksums for sidecar downloads.
 *
 * Keys are platform target triples (or any opaque identifier the integrator
 * controls) mapped to a hex-encoded digest string. Used to verify downloaded
 * binaries before they are written to the cache.
 *
 * @example
 * ```ts
 * const checksums: SidecarChecksums = {
 *   algorithm: 'sha256',
 *   values: {
 *     'aarch64-apple-darwin': 'd2c1...',
 *     'x86_64-unknown-linux-gnu': '9b3a...',
 *   },
 * }
 * ```
 */
export interface SidecarChecksums {
  /**
   * Hash algorithm used to produce the digests in `values`.
   */
  readonly algorithm: 'sha256' | 'sha512'
  /**
   * Map of platform triple (or other stable key) to hex-encoded digest.
   */
  readonly values: Readonly<Record<string, string>>
}

/**
 * Configuration entry describing a single sidecar binary the CLI depends on.
 *
 * Sidecars are external executables fetched on demand and cached locally.
 * Each entry declares an identity (`name`, `version`), how to obtain the
 * artifact (`source`), which platforms are supported (`platforms`), and
 * optional behavior tweaks (`lazy`, `checksums`).
 *
 * @example
 * ```ts
 * const ruff: SidecarConfig = {
 *   name: 'ruff',
 *   version: '0.6.9',
 *   source: {
 *     kind: 'github',
 *     repo: 'astral-sh/ruff',
 *     asset: 'ruff-{version}-{triple}.tar.gz',
 *   },
 *   platforms: {
 *     'darwin-arm64': 'aarch64-apple-darwin',
 *     'linux-x64': 'x86_64-unknown-linux-gnu',
 *     'windows-x64': {
 *       triple: 'x86_64-pc-windows-msvc',
 *       asset: 'ruff-{version}-windows.zip',
 *     },
 *   },
 *   lazy: true,
 * }
 * ```
 */
export interface SidecarConfig {
  /**
   * Stable identifier for the sidecar; used as the cache directory name and
   * for log/diagnostic output.
   */
  readonly name: string
  /**
   * Version of the sidecar to install. Interpolated into the source's asset
   * template as `{version}`.
   */
  readonly version: string
  /**
   * Source descriptor specifying where the binary is fetched from.
   */
  readonly source: SidecarSource
  /**
   * Per-platform mappings. Keys are {@link CompileTarget} values; only
   * declared platforms are supported by this sidecar.
   */
  readonly platforms: Readonly<Partial<Record<CompileTarget, SidecarPlatformMapping>>>
  /**
   * When `true`, defer downloading the sidecar until first use rather than
   * fetching eagerly during install. Default: `false`.
   */
  readonly lazy?: boolean
  /**
   * Optional integrity checksums applied to downloaded artifacts.
   */
  readonly checksums?: SidecarChecksums
}

/**
 * Build options passed to tsdown during `kidd build`.
 */
export interface BuildOptions {
  /**
   * Build output directory. Default: './dist'.
   */
  out?: string
  /**
   * Node target version. Default: 'node18'.
   */
  target?: string
  /**
   * Minify the output. Default: false.
   */
  minify?: boolean
  /**
   * Generate source maps. Default: true.
   */
  sourcemap?: boolean
  /**
   * Additional external packages (beyond kidd's defaults).
   */
  external?: string[]
  /**
   * Clean build artifacts before building. Default: true.
   *
   * When enabled, only files created by kidd are removed (`.js`, `.mjs`,
   * `.map` files). Foreign files in the output directory are preserved
   * and a warning is printed.
   */
  readonly clean?: boolean
  /**
   * Compile-time constants injected via rolldown `define`.
   *
   * Keys are replaced in source code at build time with the corresponding
   * string values. Values should be JSON-stringified when embedding strings
   * (e.g. `JSON.stringify('my-value')`).
   *
   * Merged with auto-resolved `KIDD_PUBLIC_*` env vars (explicit takes precedence).
   */
  define?: Record<string, string>
}

/**
 * Binary compilation options for `kidd compile`.
 */
export interface CompileOptions {
  /**
   * Compile output directory. Default: './dist'.
   */
  out?: string
  /**
   * Cross-compilation targets. Default: current platform only.
   */
  targets?: CompileTarget[]
  /**
   * Binary name. Defaults to cli name.
   */
  name?: string
  /**
   * Load `.env` files at runtime in the compiled binary. Default: false.
   *
   * When disabled, the compiled binary will not auto-load `.env` files from
   * the working directory. Use the kidd auth dotenv strategy for explicit
   * `.env` loading instead.
   */
  readonly autoloadDotenv?: boolean
}

/**
 * Configuration for kidd.config.ts.
 */
export interface KiddConfig {
  /**
   * Entry point for the CLI. Default: './index.ts'.
   */
  entry?: string
  /**
   * Where commands live. Default: './commands'.
   */
  commands?: string
  /**
   * Build options for kidd build.
   */
  build?: BuildOptions
  /**
   * Binary compilation options for kidd build --compile.
   *
   * - `true` enables compilation with default options.
   * - An object provides explicit compile options (targets, output dir, name).
   * - `false` or omitted disables compilation.
   */
  compile?: boolean | CompileOptions
  /**
   * Extra file globs to include in the bundle.
   */
  include?: string[]
  /**
   * Sidecar binaries the CLI depends on.
   *
   * Each entry declares an external executable that is fetched and cached
   * for the user's platform. See {@link SidecarConfig} for the full shape.
   */
  readonly sidecars?: readonly SidecarConfig[]
}
