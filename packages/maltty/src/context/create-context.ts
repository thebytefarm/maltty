import pc from 'picocolors'
import type { Colors } from 'picocolors/types'

import { createDotDirectory } from '@/lib/dotdir/index.js'
import { createLog } from '@/lib/log.js'
import type { AnyRecord, MalttyStore, Merge } from '@/types/index.js'

import { createContextError } from './error.js'
import { createContextFormat } from './format.js'
import { createContextPrompts } from './prompts.js'
import { createContextStatus } from './status.js'
import { createMemoryStore } from './store.js'
import type {
  CommandContext,
  DisplayConfig,
  Format,
  Log,
  Meta,
  Prompts,
  Status,
  Store,
  StoreMap,
} from './types.js'

/**
 * Options for creating a {@link CommandContext} instance via {@link createContext}.
 *
 * Carries the parsed args and CLI metadata needed to assemble a fully-wired
 * context. Optional overrides allow callers to inject custom {@link Log},
 * {@link Prompts}, and {@link Status} implementations; when omitted, default
 * `@clack/prompts`-backed instances are used.
 */
export interface CreateContextOptions<TArgs extends AnyRecord> {
  readonly args: TArgs
  readonly argv: readonly string[]
  readonly meta: {
    readonly name: string
    readonly version: string
    readonly command: string[]
    readonly dirs: { readonly local: string; readonly global: string }
  }
  readonly display?: DisplayConfig
  readonly log?: Log
  readonly prompts?: Prompts
  readonly status?: Status
}

/**
 * Create the {@link CommandContext} object threaded through middleware and command handlers.
 *
 * Assembles log, status, format, store, prompts, and meta from
 * the provided options into a single immutable context. Each sub-system is
 * constructed via its own factory so this function remains a lean orchestrator.
 *
 * When `display` is provided, per-call defaults are extracted and passed
 * to each factory. Global-only settings (`aliases`, `messages`) are applied
 * via `updateSettings()` at boot time in `cli()`, not here.
 *
 * @param options - Args, config, and meta for the current invocation.
 * @returns A fully constructed CommandContext.
 */
export function createContext<TArgs extends AnyRecord>(
  options: CreateContextOptions<TArgs>
): CommandContext<TArgs> {
  const dc = options.display ?? {}
  const commonDefaults = resolveCommonDefaults(dc)

  const ctxLog: Log =
    options.log ??
    createLog({
      boxDefaults: dc.box,
      defaults: commonDefaults,
      output: dc.output,
    })
  const ctxStatus: Status = resolveStatus(options, dc, commonDefaults)
  const ctxFormat: Format = createContextFormat()
  const ctxStore: Store<Merge<MalttyStore, StoreMap>> = createMemoryStore()
  const ctxPrompts: Prompts =
    options.prompts ??
    createContextPrompts({
      defaults: commonDefaults,
    })
  const ctxMeta: Meta = {
    command: options.meta.command,
    dirs: Object.freeze({ ...options.meta.dirs }),
    name: options.meta.name,
    version: options.meta.version,
  }

  const ctxDotdir = createDotDirectory({ dirs: options.meta.dirs })

  // Middleware-augmented properties (e.g. `report`, `auth`) are added at runtime.
  // See `decorateContext` — they are intentionally absent here.
  return {
    args: options.args as CommandContext<TArgs>['args'],
    colors: Object.freeze({ ...pc }) as Colors,
    dotdir: ctxDotdir,
    fail(message: string, failOptions?: { code?: string; exitCode?: number }): never {
      // Accepted exception: ctx.fail() is typed `never` and caught by the CLI boundary.
      // This is the framework's halt mechanism — the runner catches the thrown ContextError.
      throw createContextError(message, failOptions)
    },
    format: ctxFormat,
    log: ctxLog,
    meta: ctxMeta as CommandContext<TArgs>['meta'],
    prompts: ctxPrompts,
    raw: Object.freeze({ argv: Object.freeze([...options.argv]) }),
    status: ctxStatus,
    store: ctxStore,
  } as CommandContext<TArgs>
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extract the common per-call defaults from display config.
 *
 * @private
 * @param dc - The display config, if any.
 * @returns Common defaults suitable for prompts, log, and status factories.
 */
function resolveCommonDefaults(dc: DisplayConfig): {
  readonly guide?: boolean
  readonly input?: DisplayConfig['input']
  readonly output?: DisplayConfig['output']
} {
  return {
    guide: dc.guide,
    input: dc.input,
    output: dc.output,
  }
}

/**
 * Resolve the Status instance from options or create a default one.
 *
 * @private
 * @param options - The create context options.
 * @param dc - The resolved display config.
 * @param commonDefaults - Common per-call defaults from display config.
 * @returns A Status instance.
 */
function resolveStatus<TArgs extends AnyRecord>(
  options: CreateContextOptions<TArgs>,
  dc: DisplayConfig,
  commonDefaults: { readonly guide?: boolean; readonly output?: DisplayConfig['output'] }
): Status {
  if (options.status !== undefined) {
    return options.status
  }

  return createContextStatus({
    defaults: commonDefaults,
    progressConfig: dc.progress,
    spinnerConfig: dc.spinner,
  })
}
