import type { CheckInput, FindingInput, SummaryInput } from '@/lib/format/types.js'

// ---------------------------------------------------------------------------
// Output Entries
// ---------------------------------------------------------------------------

/**
 * Log level for a log entry.
 */
export type LogLevel = 'error' | 'info' | 'message' | 'step' | 'success' | 'warn'

/**
 * A single log entry in the output stream.
 */
export interface LogEntry {
  readonly kind: 'log'
  readonly level: LogLevel
  readonly text: string
  readonly symbol?: string
}

/**
 * A raw text entry in the output stream.
 */
export interface RawEntry {
  readonly kind: 'raw'
  readonly text: string
}

/**
 * A newline entry in the output stream.
 */
export interface NewlineEntry {
  readonly kind: 'newline'
}

/**
 * A check row entry in the output stream.
 */
export interface CheckEntry {
  readonly kind: 'check'
  readonly input: CheckInput
}

/**
 * A finding entry in the output stream.
 */
export interface FindingEntry {
  readonly kind: 'finding'
  readonly input: FindingInput
}

/**
 * A summary entry in the output stream.
 */
export interface SummaryEntry {
  readonly kind: 'summary'
  readonly input: SummaryInput
}

/**
 * Discriminated union of all output entry types (without ID).
 *
 * Used as input to the store's `push` method.
 */
export type OutputEntryInput =
  | CheckEntry
  | FindingEntry
  | LogEntry
  | NewlineEntry
  | RawEntry
  | SummaryEntry

/**
 * An output entry with a unique monotonic ID for stable React keys.
 */
export type OutputEntry = OutputEntryInput & {
  readonly id: number
}

// ---------------------------------------------------------------------------
// Spinner State
// ---------------------------------------------------------------------------

/**
 * State of the screen-backed spinner.
 */
export type SpinnerState =
  | { readonly status: 'idle' }
  | { readonly status: 'spinning'; readonly message: string }
  | { readonly status: 'stopped'; readonly message: string }
  | { readonly status: 'cancelled'; readonly message: string }
  | { readonly status: 'error'; readonly message: string }

// ---------------------------------------------------------------------------
// Output Store
// ---------------------------------------------------------------------------

/**
 * Subscribe callback for external store consumers.
 */
export type OutputSubscriber = () => void

/**
 * Snapshot of the output store state for React consumption.
 */
export interface OutputSnapshot {
  readonly entries: readonly OutputEntry[]
  readonly spinner: SpinnerState
}

/**
 * External store that accumulates output entries and spinner state.
 *
 * Compatible with React's `useSyncExternalStore` hook.
 */
export interface OutputStore {
  /**
   * Get the current snapshot of entries and spinner state.
   */
  readonly getSnapshot: () => OutputSnapshot

  /**
   * Subscribe to store changes.
   *
   * @param callback - Called when the store changes.
   * @returns An unsubscribe function.
   */
  readonly subscribe: (callback: OutputSubscriber) => () => void

  /**
   * Append an output entry (ID is assigned automatically).
   */
  readonly push: (entry: OutputEntryInput) => void

  /**
   * Update the spinner state.
   */
  readonly setSpinner: (state: SpinnerState) => void
}
