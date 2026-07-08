import type { CompileTarget } from './utils/compile.js'

/**
 * Build options passed to tsdown during `maltty build`.
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
   * Additional external packages (beyond maltty's defaults).
   */
  external?: string[]
  /**
   * Clean build artifacts before building. Default: true.
   *
   * When enabled, only files created by maltty are removed (`.js`, `.mjs`,
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
   * Merged with auto-resolved `MALTTY_PUBLIC_*` env vars (explicit takes precedence).
   */
  define?: Record<string, string>
}

/**
 * Binary compilation options for `maltty compile`.
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
   * the working directory. Use the maltty auth dotenv strategy for explicit
   * `.env` loading instead.
   */
  readonly autoloadDotenv?: boolean
}

/**
 * Configuration for maltty.config.ts.
 */
export interface MalttyConfig {
  /**
   * Entry point for the CLI. Default: './index.ts'.
   */
  entry?: string
  /**
   * Where commands live. Default: './commands'.
   */
  commands?: string
  /**
   * Build options for maltty build.
   */
  build?: BuildOptions
  /**
   * Binary compilation options for maltty build --compile.
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
}
