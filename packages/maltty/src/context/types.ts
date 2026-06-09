import type { Readable, Writable } from 'node:stream'

import type { Colors } from 'picocolors/types'

import type { DotDirectory } from '@/lib/dotdir/types.js'
import type {
  AnyRecord,
  DeepReadonly,
  MalttyArgs,
  MalttyStore,
  Merge,
  ResolvedDirs,
  StringKeyOf,
} from '@/types/index.js'

/**
 * Typed in-memory key-value store shape carried on `ctx.store`.
 *
 * Consumers extend this interface via declaration merging to register
 * typed keys without threading generics through every handler:
 *
 * ```ts
 * declare module 'maltty' {
 *   interface StoreMap { myKey: MyType }
 * }
 * ```
 */
export interface StoreMap {
  [key: string]: unknown
}

/**
 * Typed key-value store available on every {@link CommandContext}.
 *
 * Provides `get`, `set`, `has`, `delete`, and `clear` over an in-memory
 * `Map`. The generic `TMap` constrains keys and values so consumers
 * receive compile-time safety for registered store keys.
 *
 * @typeParam TMap - Key-value shape (defaults to {@link StoreMap}).
 */
export interface Store<TMap extends AnyRecord = StoreMap> {
  get<TKey extends StringKeyOf<TMap>>(key: TKey): TMap[TKey] | undefined
  set<TKey extends StringKeyOf<TMap>>(key: TKey, value: TMap[TKey]): void
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
}

// ---------------------------------------------------------------------------
// Display config
// ---------------------------------------------------------------------------

/**
 * Action types for key alias mappings.
 */
export type DisplayAction = 'up' | 'down' | 'left' | 'right' | 'space' | 'enter' | 'cancel'

/**
 * Configuration defaults for clack-backed prompts, logs, and status indicators.
 *
 * Values are injected as per-call defaults into every clack API call.
 * Method-level options always take precedence over these defaults.
 *
 * Only `aliases` and `messages` require global application via
 * `updateSettings()` — all other values are merged per-call.
 */
export interface DisplayConfig {
  /**
   * Show navigation guide hints on interactive prompts.
   * Applied per-call via `CommonOptions.guide`.
   */
  readonly guide?: boolean

  /**
   * Custom input stream for all prompts.
   * Applied per-call via `CommonOptions.input`.
   */
  readonly input?: Readable

  /**
   * Custom output stream for all prompts and log methods.
   * Applied per-call via `CommonOptions.output`.
   */
  readonly output?: Writable

  /**
   * Custom key aliases (e.g. map `'j'` → `'down'`, `'k'` → `'up'`).
   * Applied globally via `updateSettings()` — cannot be set per-call.
   */
  readonly aliases?: Record<string, DisplayAction>

  /**
   * Override default cancel/error messages shown by clack.
   * Applied globally via `updateSettings()` — cannot be set per-call.
   */
  readonly messages?: {
    readonly cancel?: string
    readonly error?: string
  }

  /**
   * Spinner configuration defaults.
   */
  readonly spinner?: {
    /**
     * Animation style: `'dots'` (default) or `'timer'`.
     */
    readonly indicator?: 'dots' | 'timer'
    /**
     * Custom animation frame characters.
     */
    readonly frames?: readonly string[]
    /**
     * Frame delay in ms.
     */
    readonly delay?: number
    /**
     * Custom frame styling function.
     */
    readonly styleFrame?: (frame: string) => string
    /**
     * Message shown on cancel.
     */
    readonly cancelMessage?: string
    /**
     * Message shown on error.
     */
    readonly errorMessage?: string
  }

  /**
   * Progress bar configuration defaults.
   */
  readonly progress?: {
    /**
     * Bar style: `'light'`, `'heavy'`, or `'block'`.
     */
    readonly style?: 'light' | 'heavy' | 'block'
    /**
     * Bar width in characters.
     */
    readonly size?: number
  }

  /**
   * Box display configuration defaults.
   */
  readonly box?: {
    readonly rounded?: boolean
    readonly contentAlign?: 'left' | 'center' | 'right'
    readonly titleAlign?: 'left' | 'center' | 'right'
    readonly contentPadding?: number
    readonly titlePadding?: number
    readonly width?: number | 'auto'
    /**
     * Custom border styling function.
     */
    readonly formatBorder?: (text: string) => string
  }
}

// ---------------------------------------------------------------------------
// Prompt option types
// ---------------------------------------------------------------------------

/**
 * Options for a yes/no confirmation prompt.
 */
export interface ConfirmOptions {
  readonly message: string
  readonly active?: string
  readonly inactive?: string
  readonly initialValue?: boolean
  /**
   * Display active/inactive options vertically instead of inline.
   */
  readonly vertical?: boolean
}

/**
 * Options for a free-text input prompt.
 */
export interface TextOptions {
  readonly message: string
  readonly placeholder?: string
  readonly defaultValue?: string
  readonly initialValue?: string
  readonly validate?: (value: string | undefined) => string | Error | undefined
}

/**
 * Options for a masked password input prompt.
 */
export interface PasswordOptions {
  readonly message: string
  readonly mask?: string
  readonly validate?: (value: string | undefined) => string | Error | undefined
  /**
   * Clear the input when validation fails.
   */
  readonly clearOnError?: boolean
}

/**
 * A single option in a select or multi-select prompt.
 *
 * @typeParam TValue - The value type returned when this option is selected.
 */
export interface SelectOption<TValue> {
  readonly value: TValue
  readonly label: string
  readonly hint?: string
  readonly disabled?: boolean
}

/**
 * Options for a single-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface SelectOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly initialValue?: TValue
  readonly maxItems?: number
}

/**
 * Options for a multi-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface MultiSelectOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly initialValues?: TValue[]
  readonly required?: boolean
  readonly cursorAt?: TValue
  readonly maxItems?: number
}

/**
 * Options for a grouped multi-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface GroupMultiSelectOptions<TValue> {
  readonly message: string
  readonly options: Record<string, SelectOption<TValue>[]>
  readonly initialValues?: TValue[]
  readonly required?: boolean
  readonly selectableGroups?: boolean
  /**
   * Position the cursor at a specific value on mount.
   */
  readonly cursorAt?: TValue
  /**
   * Number of blank lines between groups.
   */
  readonly groupSpacing?: number
}

/**
 * Options for a type-ahead autocomplete prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface AutocompleteOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly placeholder?: string
  readonly maxItems?: number
  readonly initialValue?: TValue
  readonly validate?: (value: TValue) => string | Error | undefined
  readonly filter?: (search: string, option: SelectOption<TValue>) => boolean
  /**
   * Pre-fill the text input with an initial user query.
   */
  readonly initialUserInput?: string
}

/**
 * Options for a type-ahead autocomplete multi-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface AutocompleteMultiSelectOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly placeholder?: string
  readonly maxItems?: number
  readonly initialValues?: TValue[]
  readonly required?: boolean
}

/**
 * Options for a key-press selection prompt.
 *
 * @typeParam TValue - The value type (must be a string for key matching).
 */
export interface SelectKeyOptions<TValue extends string> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly initialValue?: TValue
  /**
   * Whether key matching is case-sensitive.
   */
  readonly caseSensitive?: boolean
}

/**
 * Options for a filesystem path autocomplete prompt.
 */
export interface PathOptions {
  readonly message: string
  readonly root?: string
  readonly directory?: boolean
  readonly initialValue?: string
  readonly validate?: (value: string | undefined) => string | Error | undefined
}

/**
 * Options for the {@link Prompts.group} method.
 *
 * @typeParam TResult - The shape of the accumulated results object.
 */
export interface PromptGroupOptions<TResult> {
  readonly onCancel?: (params: { readonly results: Partial<TResult> }) => void
}

/**
 * A record of prompt functions that share accumulated results.
 *
 * Each function receives the results collected so far and returns a
 * prompt result or `undefined` to skip.
 *
 * @typeParam TResult - The shape of the accumulated results object.
 */
export type PromptGroup<TResult> = {
  [K in keyof TResult]: (opts: {
    readonly results: Partial<TResult>
  }) => Promise<TResult[K] | symbol> | undefined
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/**
 * Async iterable streaming log methods.
 *
 * Each method streams content token-by-token with a styled prefix.
 */
export interface StreamLog {
  readonly info: (iterable: AsyncIterable<string>) => Promise<void>
  readonly success: (iterable: AsyncIterable<string>) => Promise<void>
  readonly error: (iterable: AsyncIterable<string>) => Promise<void>
  readonly warn: (iterable: AsyncIterable<string>) => Promise<void>
  readonly step: (iterable: AsyncIterable<string>) => Promise<void>
  readonly message: (iterable: AsyncIterable<string>) => Promise<void>
}

/**
 * Options for styled log messages (info, success, error, warn, step, message).
 */
export interface LogMessageOptions {
  /**
   * Custom symbol prefix.
   */
  readonly symbol?: string
  /**
   * Number of blank lines before the message.
   */
  readonly spacing?: number
  /**
   * Secondary symbol for continuation lines.
   */
  readonly secondarySymbol?: string
}

/**
 * Options for a boxed note display.
 */
export interface NoteOptions {
  /**
   * Custom line formatter applied to each line of the note body.
   */
  readonly format?: (line: string) => string
}

/**
 * Options for a bordered box display.
 */
export interface BoxOptions {
  readonly width?: number | 'auto'
  readonly contentAlign?: 'left' | 'center' | 'right'
  readonly titleAlign?: 'left' | 'center' | 'right'
  readonly contentPadding?: number
  readonly titlePadding?: number
  readonly rounded?: boolean
  /**
   * Custom border styling function.
   */
  readonly formatBorder?: (text: string) => string
}

/**
 * Structured logging API backed by `@clack/prompts` for styled terminal output.
 *
 * Provides info, success, error, warning, step, message, intro/outro,
 * note, box, stream, and raw output methods. Does not include prompts or
 * status indicators — those are separate on `ctx.prompts` and `ctx.status`.
 */
export interface Log {
  /**
   * Log an informational message.
   */
  readonly info: (message: string, opts?: LogMessageOptions) => void
  /**
   * Log a success message.
   */
  readonly success: (message: string, opts?: LogMessageOptions) => void
  /**
   * Log an error message.
   */
  readonly error: (message: string, opts?: LogMessageOptions) => void
  /**
   * Log a warning message.
   */
  readonly warn: (message: string, opts?: LogMessageOptions) => void
  /**
   * Log a step indicator message.
   */
  readonly step: (message: string, opts?: LogMessageOptions) => void
  /**
   * Log a message with optional styling.
   */
  readonly message: (message: string, opts?: LogMessageOptions) => void
  /**
   * Print an intro banner with an optional title.
   */
  readonly intro: (title?: string) => void
  /**
   * Print an outro banner with an optional closing message.
   */
  readonly outro: (message?: string) => void
  /**
   * Display a boxed note with an optional title and formatting options.
   */
  readonly note: (message?: string, title?: string, opts?: NoteOptions) => void
  /**
   * Display a bordered box with an optional title and formatting options.
   */
  readonly box: (message: string, title?: string, opts?: BoxOptions) => void
  /**
   * Write a blank line to the output stream.
   */
  readonly newline: () => void
  /**
   * Write raw text followed by a newline to the output stream.
   */
  readonly raw: (text: string) => void
  /**
   * Streaming log methods for async iterables (token-by-token output).
   */
  readonly stream: StreamLog
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

/**
 * Interactive prompt methods available on the context.
 *
 * Each method suspends execution until the user provides input.
 * Cancellation (Ctrl-C) throws a ContextError with code `PROMPT_CANCELLED`.
 */
export interface Prompts {
  confirm(opts: ConfirmOptions): Promise<boolean>
  text(opts: TextOptions): Promise<string>
  select<TValue>(opts: SelectOptions<TValue>): Promise<TValue>
  multiselect<TValue>(opts: MultiSelectOptions<TValue>): Promise<TValue[]>
  password(opts: PasswordOptions): Promise<string>
  autocomplete<TValue>(opts: AutocompleteOptions<TValue>): Promise<TValue>
  autocompleteMultiselect<TValue>(opts: AutocompleteMultiSelectOptions<TValue>): Promise<TValue[]>
  groupMultiselect<TValue>(opts: GroupMultiSelectOptions<TValue>): Promise<TValue[]>
  selectKey<TValue extends string>(opts: SelectKeyOptions<TValue>): Promise<TValue>
  path(opts: PathOptions): Promise<string>
  group<TResult>(
    prompts: PromptGroup<TResult>,
    opts?: PromptGroupOptions<TResult>
  ): Promise<TResult>
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Terminal spinner for indicating long-running operations.
 */
export interface Spinner {
  start(message?: string): void
  stop(message?: string): void
  message(message?: string): void
  /**
   * End the spinner with a cancellation message.
   */
  cancel(message?: string): void
  /**
   * End the spinner with an error message.
   */
  error(message?: string): void
  /**
   * Clear the spinner from the terminal without a final message.
   */
  clear(): void
  /**
   * Whether the spinner was cancelled by the user.
   */
  readonly isCancelled: boolean
}

/**
 * A progress bar handle for tracking completion of an operation.
 */
export interface ProgressBar {
  start(message?: string): void
  advance(step?: number, message?: string): void
  stop(message?: string): void
  /**
   * Update the progress bar message without advancing.
   */
  message(message?: string): void
  /**
   * End the progress bar with a cancellation message.
   */
  cancel(message?: string): void
  /**
   * End the progress bar with an error message.
   */
  error(message?: string): void
  /**
   * Clear the progress bar from the terminal without a final message.
   */
  clear(): void
  /**
   * Whether the progress bar was cancelled by the user.
   */
  readonly isCancelled: boolean
}

/**
 * Options for creating a progress bar.
 */
export interface ProgressOptions {
  readonly max?: number
  readonly size?: number
  readonly style?: 'light' | 'heavy' | 'block'
}

/**
 * A single task definition for the sequential task runner.
 */
export interface TaskDef {
  readonly title: string
  readonly task: (message: (msg: string) => void) => Promise<string | void>
  readonly enabled?: boolean
}

/**
 * Options for a task log message call.
 */
export interface TaskLogMessageOptions {
  /**
   * Pass `true` to skip line-level formatting and emit raw text.
   */
  readonly raw?: boolean
}

/**
 * Options for a task log completion call (success/error).
 */
export interface TaskLogCompletionOptions {
  /**
   * When `true`, the accumulated log lines are retained after completion.
   */
  readonly showLog?: boolean
}

/**
 * Options for creating a task log.
 */
export interface TaskLogOptions {
  readonly title: string
  readonly limit?: number
  readonly retainLog?: boolean
  /**
   * Number of blank lines between groups.
   */
  readonly spacing?: number
}

/**
 * A task log sub-group handle returned by {@link TaskLogHandle.group}.
 */
export interface TaskLogGroupHandle {
  message(line: string, opts?: TaskLogMessageOptions): void
  success(message: string): void
  error(message: string): void
}

/**
 * A task log handle for streaming sub-process output.
 */
export interface TaskLogHandle {
  message(line: string, opts?: TaskLogMessageOptions): void
  success(message: string, opts?: TaskLogCompletionOptions): void
  error(message: string, opts?: TaskLogCompletionOptions): void
  /**
   * Create a named sub-group within this task log.
   */
  group(name: string): TaskLogGroupHandle
}

/**
 * Live stateful status indicators for in-flight work.
 *
 * Each method creates or runs an indicator that occupies terminal space
 * during an async operation and resolves when complete.
 */
export interface Status {
  /**
   * Pre-created spinner for indicating long-running operations.
   */
  readonly spinner: Spinner
  /**
   * Create a progress bar for tracking completion.
   */
  progress(opts?: ProgressOptions): ProgressBar
  /**
   * Run a sequence of tasks with per-task spinners.
   */
  tasks(tasks: readonly TaskDef[]): Promise<void>
  /**
   * Create a task log for streaming sub-process output.
   */
  taskLog(opts: TaskLogOptions): TaskLogHandle
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

/**
 * Pure string formatters for data serialization (no I/O).
 */
export interface Format {
  /**
   * Serialize a value as pretty-printed JSON.
   */
  json(data: unknown): string
  /**
   * Format an array of objects as an aligned text table.
   */
  table(rows: readonly Record<string, unknown>[]): string
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

/**
 * CLI metadata available on the context. Deeply immutable at the type level.
 */
export interface Meta {
  /**
   * CLI name as defined in `cli({ name })`.
   */
  readonly name: string
  /**
   * CLI version as defined in `cli({ version })`.
   */
  readonly version: string
  /**
   * The resolved command path (e.g. `['deploy', 'preview']`).
   */
  readonly command: readonly string[]
  /**
   * Resolved directory names for file-backed stores.
   *
   * `local` resolves relative to the project root, `global` resolves
   * relative to the user's home directory.
   */
  readonly dirs: ResolvedDirs
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Keys on {@link CommandContext} that are stripped from {@link ScreenContext}.
 *
 * `log` and `status` are **not** stripped — they are swapped with
 * React-backed implementations by `screen()` so they render through
 * the `<Output />` component.
 *
 * Only properties that have no screen-safe equivalent are omitted:
 * `colors`, `fail`, `format`, `prompts`.
 */
export type ImperativeContextKeys = 'colors' | 'fail' | 'format' | 'prompts'

/**
 * Context subset available inside `screen()` components via `useScreenContext()`.
 *
 * Retains `log` and `status` (swapped with React-backed implementations),
 * data properties (`args`, `meta`, `store`), and any
 * middleware-decorated properties (`auth`, `http`, `report`, `config`, etc.).
 *
 * Omits `colors`, `fail`, `format`, and `prompts` which have no
 * screen-safe equivalent.
 *
 * @typeParam TArgs - Parsed args type.
 */
export type ScreenContext<TArgs extends AnyRecord = AnyRecord> = Omit<
  CommandContext<TArgs>,
  ImperativeContextKeys
>

/**
 * The context object threaded through every handler, middleware, and hook.
 *
 * Contains framework-level primitives: parsed args, CLI metadata, a key-value
 * store, formatting helpers, logging, prompts, status indicators, and a fail
 * function. Additional capabilities (e.g. `config`, `report`, `auth`) are
 * added by middleware via `decorateContext`.
 *
 * All data properties (args, meta) are deeply readonly — attempting to mutate
 * any nested property produces a compile-time error. Use `ctx.store` for
 * mutable state that flows between middleware and handlers.
 *
 * @typeParam TArgs - Parsed args type (inferred from the command's zod/yargs args definition).
 */
export interface CommandContext<TArgs extends AnyRecord = AnyRecord> {
  /**
   * Parsed and validated args for this command. Deeply immutable.
   */
  readonly args: DeepReadonly<Merge<MalttyArgs, TArgs>>

  /**
   * Color formatting utilities (picocolors). Use for coloring summary
   * values, diagnostic output, and other terminal text.
   */
  readonly colors: Colors

  /**
   * Dot directory manager for reading/writing files in the CLI's
   * dot directories (e.g. `~/.myapp/`, `<project>/.myapp/`).
   */
  readonly dotdir: DotDirectory

  /**
   * Pure string formatters for data serialization (no I/O).
   */
  readonly format: Format

  /**
   * Structured logger for styled terminal output.
   */
  readonly log: Log

  /**
   * Interactive prompts (confirm, text, select, multiselect, password, autocomplete, path, group).
   */
  readonly prompts: Prompts

  /**
   * Live status indicators for in-flight work (spinner, progress, tasks, taskLog).
   */
  readonly status: Status

  /**
   * In-memory key-value store (mutable — use this for middleware-to-handler data flow).
   */
  readonly store: Store<Merge<MalttyStore, StoreMap>>

  /**
   * Throw a user-facing error with a clean message (no stack in production).
   */
  readonly fail: (message: string, options?: { code?: string; exitCode?: number }) => never

  /**
   * CLI metadata (name, version, resolved command path). Deeply immutable.
   */
  readonly meta: DeepReadonly<Meta>

  /**
   * Raw invocation data not processed by the arg parser.
   *
   * `argv` is a normalized token array where `argv[0]` is always the CLI
   * name regardless of invocation mode (`node script.js …` vs compiled
   * binary). Middleware can inspect the full invocation without guessing
   * the preamble offset.
   */
  readonly raw: {
    readonly argv: readonly string[]
  }
}
