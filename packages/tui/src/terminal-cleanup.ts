import process from 'node:process'

/**
 * Process operations required by coordinated terminal cleanup.
 */
export interface TerminalCleanupHost {
  readonly addExitHandler: (handler: () => void) => void
  readonly addSignalHandler: (
    signal: NodeJS.Signals,
    handler: (signal: NodeJS.Signals) => void
  ) => void
  readonly removeExitHandler: (handler: () => void) => void
  readonly removeSignalHandler: (
    signal: NodeJS.Signals,
    handler: (signal: NodeJS.Signals) => void
  ) => void
  readonly terminate: (signal: NodeJS.Signals) => void
}

/**
 * Shared registry for synchronous terminal restoration callbacks.
 */
export interface TerminalCleanupCoordinator {
  readonly register: (cleanup: () => void) => void
  readonly unregister: (cleanup: () => void) => void
}

/**
 * Create a terminal cleanup coordinator that owns process termination signals.
 *
 * Every registered terminal feature is restored before the process exits with
 * the signal's conventional status. Registering the same callback repeatedly
 * is idempotent.
 *
 * @param options - Optionally injectable process operations.
 * @returns A frozen cleanup registry.
 */
export function createTerminalCleanupCoordinator({
  host = nodeTerminalCleanupHost,
}: {
  readonly host?: TerminalCleanupHost
} = {}): TerminalCleanupCoordinator {
  const cleanups = new Set<() => void>()

  /**
   * @private
   */
  function runCleanups(): void {
    const pending = [...cleanups]
    cleanups.clear()
    pending.map(runCleanupSafely)
  }

  /**
   * Keep each terminal restoration independent so one failing writer cannot
   * block the remaining callbacks or process termination.
   *
   * @private
   */
  function runCleanupSafely(cleanup: () => void): void {
    try {
      cleanup()
    } catch {
      // Terminal restoration is best effort during process termination.
    }
  }

  /**
   * @private
   */
  function unregisterHostHandlers(): void {
    host.removeSignalHandler('SIGINT', handleSignal)
    host.removeSignalHandler('SIGTERM', handleSignal)
    host.removeExitHandler(handleExit)
  }

  /**
   * @private
   */
  function handleSignal(signal: NodeJS.Signals): void {
    unregisterHostHandlers()
    runCleanups()
    host.terminate(signal)
  }

  /**
   * @private
   */
  function handleExit(): void {
    runCleanups()
  }

  /**
   * @private
   */
  function register(cleanup: () => void): void {
    const shouldRegisterHost = cleanups.size === 0
    cleanups.add(cleanup)
    if (shouldRegisterHost) {
      host.addSignalHandler('SIGINT', handleSignal)
      host.addSignalHandler('SIGTERM', handleSignal)
      host.addExitHandler(handleExit)
    }
  }

  /**
   * @private
   */
  function unregister(cleanup: () => void): void {
    cleanups.delete(cleanup)
    if (cleanups.size === 0) {
      unregisterHostHandlers()
    }
  }

  return Object.freeze({ register, unregister })
}

const nodeTerminalCleanupHost: TerminalCleanupHost = Object.freeze({
  addExitHandler: (handler: () => void) => process.on('exit', handler),
  addSignalHandler: (signal: NodeJS.Signals, handler: (signal: NodeJS.Signals) => void) =>
    process.on(signal, handler),
  removeExitHandler: (handler: () => void) => process.off('exit', handler),
  removeSignalHandler: (signal: NodeJS.Signals, handler: (signal: NodeJS.Signals) => void) =>
    process.off(signal, handler),
  terminate: (signal: NodeJS.Signals) => {
    const exitCodes: Readonly<Partial<Record<NodeJS.Signals, number>>> = {
      SIGINT: 130,
      SIGTERM: 143,
    }
    const exitCode = exitCodes[signal] ?? 1
    const fallback = setTimeout(() => process.exit(exitCode), 100)
    fallback.unref()
    process.stdout.write('', () => {
      clearTimeout(fallback)
      process.exit(exitCode)
    })
  },
})

/**
 * Process-wide terminal cleanup coordinator used by terminal features.
 */
export const terminalCleanup: TerminalCleanupCoordinator = createTerminalCleanupCoordinator()
