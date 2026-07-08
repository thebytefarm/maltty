import type { DisplayConfig, Log, Prompts, Status } from '@/context/types.js'

import type { CommandMap, CommandsConfig } from './command.js'
import type { Middleware } from './middleware.js'

// ---------------------------------------------------------------------------
// CLI types
// ---------------------------------------------------------------------------

/**
 * Global args merged into every ctx.args.
 */
export interface MalttyArgs {}

/**
 * Global store keys merged into every ctx.store.
 */
export interface MalttyStore {}

/**
 * Directory name overrides for file-backed stores (auth, config).
 *
 * Both `local` and `global` default to `.<cli-name>` when omitted.
 * Local resolves relative to the project root, global resolves relative
 * to the user's home directory.
 */
export interface DirsConfig {
  /**
   * Directory name for project-local resolution.
   * Resolves as `<project-root>/<local>`. Defaults to `.<cli-name>`.
   */
  readonly local?: string
  /**
   * Directory name for global (home directory) resolution.
   * Resolves as `~/<global>`. Defaults to `.<cli-name>`.
   */
  readonly global?: string
}

/**
 * Resolved directory names where both local and global are guaranteed strings.
 */
export interface ResolvedDirs {
  readonly local: string
  readonly global: string
}

/**
 * Help output customization options.
 *
 * Used at both the CLI level and per-command level to control how help
 * text is displayed.
 */
export interface HelpOptions {
  /**
   * Header text displayed above help output when the CLI is invoked
   * without a command. Not shown on `--help`.
   */
  readonly header?: string
  /**
   * Footer text displayed below help output (e.g., docs URL, bug report link).
   * Shown on all help output.
   */
  readonly footer?: string
  /**
   * Display order for subcommands.
   * Subcommands listed appear first in the specified order; omitted subcommands
   * fall back to alphabetical sort.
   */
  readonly order?: readonly string[]
}

/**
 * Options passed to `cli()`.
 */
export interface CliOptions {
  /**
   * CLI name. Used for help text and config file discovery.
   */
  readonly name: string
  /**
   * CLI version. Enables `--version` flag.
   *
   * When omitted, falls back to the compile-time `__MALTTY_VERSION__` constant
   * injected by the maltty bundler. An error is raised at startup if neither
   * an explicit version nor `__MALTTY_VERSION__` is available.
   */
  readonly version?: string
  /**
   * Human-readable description shown in help text.
   */
  readonly description?: string
  /**
   * Middleware stack. Executed in order before each command handler.
   */
  readonly middleware?: Middleware[]
  /**
   * Override the commands source. When omitted, `cli()` loads `maltty.config.ts`
   * and autoloads from its `commands` field (falling back to `'./commands'`).
   *
   * Accepts a directory path string, a static {@link CommandMap}, a
   * `Promise<CommandMap>`, or a structured {@link CommandsConfig} grouping
   * the source with display ordering.
   */
  readonly commands?: string | CommandMap | Promise<CommandMap> | CommandsConfig
  /**
   * Help output customization (header, footer, command order).
   */
  readonly help?: HelpOptions
  /**
   * Directory name overrides for file-backed stores (auth, config).
   *
   * Both `local` and `global` default to `.<name>` when omitted.
   */
  readonly dirs?: DirsConfig
  /**
   * Default configuration for clack-backed prompts, logs, and status indicators.
   * Values are injected as per-call defaults; method-level options always win.
   */
  readonly display?: DisplayConfig
  /**
   * Custom log implementation. When omitted, a default `@clack/prompts`-backed
   * logger is created automatically.
   */
  readonly log?: Log
  /**
   * Custom prompts implementation. When omitted, a default `@clack/prompts`-backed
   * prompts instance is created automatically.
   */
  readonly prompts?: Prompts
  /**
   * Custom status indicator implementation. When omitted, default
   * `@clack/prompts`-backed status indicators are created automatically.
   */
  readonly status?: Status
  /**
   * When `true` (the default), yargs rejects unknown flags with an error.
   * Set to `false` to allow unknown flags to pass through unchecked.
   *
   * Individual commands can override this value via their own `strict` field.
   */
  readonly strict?: boolean
}

/**
 * Signature of the `cli()` entry point function.
 */
export type CliFn = (options: CliOptions) => Promise<void>
