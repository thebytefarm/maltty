import { match } from 'ts-pattern'

import type { Log, LogMessageOptions, NoteOptions, StreamLog } from '@/context/types.js'

import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Create a {@link Log} instance that writes to an {@link OutputStore}
 * for rendering by the `<Output />` component.
 *
 * @param store - The output store to push entries to.
 * @returns A frozen Log instance compatible with `ctx.log`.
 */
export function createScreenLog(store: OutputStore): Log {
  return Object.freeze({
    info(message: string, _opts?: LogMessageOptions): void {
      store.push({ kind: 'log', level: 'info', text: message })
    },

    success(message: string, _opts?: LogMessageOptions): void {
      store.push({ kind: 'log', level: 'success', text: message })
    },

    error(message: string, _opts?: LogMessageOptions): void {
      store.push({ kind: 'log', level: 'error', text: message })
    },

    warn(message: string, _opts?: LogMessageOptions): void {
      store.push({ kind: 'log', level: 'warn', text: message })
    },

    step(message: string, _opts?: LogMessageOptions): void {
      store.push({ kind: 'log', level: 'step', text: message })
    },

    message(message: string, opts?: LogMessageOptions): void {
      const symbol = match(opts)
        .with(undefined, () => undefined)
        .otherwise((o) => o.symbol)
      store.push({ kind: 'log', level: 'message', text: message, symbol })
    },

    intro(_title?: string): void {
      // No-op in screen context — screens handle their own layout
    },

    outro(_message?: string): void {
      // No-op in screen context — screens handle their own exit
    },

    note(_message?: string, _title?: string, _opts?: NoteOptions): void {
      // No-op in screen context — use Box/Text for notes
    },

    newline(): void {
      store.push({ kind: 'newline' })
    },

    raw(text: string): void {
      store.push({ kind: 'raw', text })
    },

    box(_message: string, _title?: string): void {
      // No-op in screen context — use Box/Text for bordered display
    },

    stream: createScreenStreamLog(),
  }) satisfies Log
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Create a no-op {@link StreamLog} for screen contexts.
 *
 * @private
 */
function createScreenStreamLog(): StreamLog {
  const noop = async (_iterable: AsyncIterable<string>): Promise<void> => {
    // No-op in screen context — streaming is not supported in React/Ink
  }

  return Object.freeze({
    info: noop,
    success: noop,
    error: noop,
    warn: noop,
    step: noop,
    message: noop,
  }) satisfies StreamLog
}
