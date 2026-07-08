import type {
  OutputEntry,
  OutputEntryInput,
  OutputSnapshot,
  OutputStore,
  OutputSubscriber,
  SpinnerState,
} from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Create an external output store for accumulating log, report,
 * and spinner state in screen components.
 *
 * @returns A frozen {@link OutputStore} instance.
 */
export function createOutputStore(): OutputStore {
  const entries: OutputEntry[] = []
  const subscribers = new Set<OutputSubscriber>()
  let nextId = 0
  const idle: SpinnerState = Object.freeze({ status: 'idle' as const })
  let spinnerState: SpinnerState = idle
  let snapshot: OutputSnapshot = Object.freeze({ entries: Object.freeze([]), spinner: idle })

  /**
   * Rebuild the snapshot and notify all subscribers.
   *
   * @private
   */
  const notify = (): void => {
    snapshot = Object.freeze({
      entries: Object.freeze([...entries]),
      spinner: spinnerState,
    })
    ;[...subscribers].map((cb) => cb())
  }

  return Object.freeze({
    getSnapshot(): OutputSnapshot {
      return snapshot
    },

    subscribe(callback: OutputSubscriber): () => void {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },

    push(entry: OutputEntryInput): void {
      const id = nextId
      nextId += 1
      entries.push({ ...entry, id })
      notify()
    },

    setSpinner(state: SpinnerState): void {
      spinnerState = state
      notify()
    },
  })
}
