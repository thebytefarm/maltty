import type { Writable } from 'node:stream'

import * as clack from '@clack/prompts'

import type { ClackBase } from './resolve-defaults.js'
import { resolveClackBase } from './resolve-defaults.js'
import type {
  DisplayConfig,
  ProgressBar,
  ProgressOptions,
  Spinner,
  Status,
  TaskDef,
  TaskLogCompletionOptions,
  TaskLogGroupHandle,
  TaskLogHandle,
  TaskLogMessageOptions,
  TaskLogOptions,
} from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for {@link createContextStatus}.
 */
export interface CreateContextStatusOptions {
  /**
   * Spinner config defaults from {@link DisplayConfig}.
   */
  readonly spinnerConfig?: DisplayConfig['spinner']
  /**
   * Progress config defaults from {@link DisplayConfig}.
   */
  readonly progressConfig?: DisplayConfig['progress']
  /**
   * Common per-call defaults (guide, output).
   */
  readonly defaults?: {
    readonly guide?: boolean
    readonly output?: Writable
  }
}

/**
 * Create the live status indicator methods for a context.
 *
 * Provides a pre-created spinner, plus factories for progress bars,
 * sequential task runners, and task logs. Each delegates to `@clack/prompts`.
 *
 * When config defaults are provided, they are merged into each clack call.
 * Method-level options always take precedence.
 *
 * @param options - Optional overrides for status sub-components.
 * @returns A frozen Status instance backed by clack.
 */
export function createContextStatus(options?: CreateContextStatusOptions): Status {
  const base = resolveClackBase(options?.defaults)
  const spinner: Spinner = createDefaultSpinner(base, options?.spinnerConfig ?? {})
  const progressConfig = options?.progressConfig ?? {}

  return Object.freeze({
    spinner,

    progress(opts?: ProgressOptions): ProgressBar {
      const bar = clack.progress({ ...base, ...progressConfig, ...opts })
      return {
        start(message?: string): void {
          bar.start(message)
        },
        advance(step?: number, message?: string): void {
          bar.advance(step, message)
        },
        stop(message?: string): void {
          bar.stop(message)
        },
        message(message?: string): void {
          bar.message(message)
        },
        cancel(message?: string): void {
          bar.cancel(message)
        },
        error(message?: string): void {
          bar.error(message)
        },
        clear(): void {
          bar.clear()
        },
        get isCancelled(): boolean {
          return bar.isCancelled
        },
      } satisfies ProgressBar
    },

    async tasks(tasks: readonly TaskDef[]): Promise<void> {
      // Accepted exception: maltty's TaskDef.task returns `Promise<string | void>`,
      // Clack expects separate `Promise<string> | Promise<void>`. The cast bridges this.
      await clack.tasks(
        tasks.map((t) => ({
          title: t.title,
          task: t.task,
          enabled: t.enabled,
        })) as Parameters<typeof clack.tasks>[0],
        base
      )
    },

    taskLog(opts: TaskLogOptions): TaskLogHandle {
      const tl = clack.taskLog({ ...base, ...opts })
      return {
        message(line: string, mopts?: TaskLogMessageOptions): void {
          tl.message(line, mopts)
        },
        success(message: string, copts?: TaskLogCompletionOptions): void {
          tl.success(message, copts)
        },
        error(message: string, copts?: TaskLogCompletionOptions): void {
          tl.error(message, copts)
        },
        group(name: string): TaskLogGroupHandle {
          const g = tl.group(name)
          return {
            message(line: string, mopts?: TaskLogMessageOptions): void {
              g.message(line, mopts)
            },
            success(message: string): void {
              g.success(message)
            },
            error(message: string): void {
              g.error(message)
            },
          } satisfies TaskLogGroupHandle
        },
      } satisfies TaskLogHandle
    },
  }) satisfies Status
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Create the default clack spinner with merged config.
 *
 * @private
 * @param base - Common clack defaults (withGuide, output).
 * @param config - Spinner-specific display config.
 * @returns A Spinner instance.
 */
function createDefaultSpinner(
  base: ClackBase,
  config: NonNullable<DisplayConfig['spinner']>
): Spinner {
  return clack.spinner({
    ...base,
    ...config,
    frames: resolveFrames(config.frames),
  })
}

/**
 * Convert readonly frames tuple to a mutable array for clack, or undefined if not set.
 *
 * @private
 * @param frames - The readonly frames from display config.
 * @returns A mutable string array or undefined.
 */
function resolveFrames(frames: readonly string[] | undefined): string[] | undefined {
  if (frames === undefined) {
    return undefined
  }
  return [...frames]
}
