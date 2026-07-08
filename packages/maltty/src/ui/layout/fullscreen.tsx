import process from 'node:process'

import { Box, useStdout } from 'ink'
import type { ReactElement, ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ANSI: switch to the alternate screen buffer. */
const ENTER_ALT_SCREEN = '\u001B[?1049h'

/**
 * ANSI: return to the normal screen buffer.
 */
export const LEAVE_ALT_SCREEN = '\u001B[?1049l'

/**
 * ANSI: clear the entire screen.
 */
const CLEAR_SCREEN = '\u001B[2J'

/**
 * ANSI: move the cursor to the top-left corner.
 */
const CURSOR_HOME = '\u001B[H'

/** ANSI: hide the cursor. */
const HIDE_CURSOR = '\u001B[?25l'

/** ANSI: show the cursor. */
const SHOW_CURSOR = '\u001B[?25h'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Terminal dimensions in columns and rows.
 */
export interface TerminalSize {
  readonly columns: number
  readonly rows: number
}

/**
 * Props for the {@link FullScreen} component.
 */
export interface FullScreenProps {
  readonly children: ReactNode
  /**
   * When `true`, hides the cursor while in fullscreen mode.
   */
  readonly hideCursor?: boolean
}

/**
 * State returned by the {@link useFullScreen} hook.
 */
export interface FullScreenState {
  readonly columns: number
  readonly isFullScreen: boolean
  readonly rows: number
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FullScreenContext = createContext<FullScreenState | null>(null)

// ---------------------------------------------------------------------------
// Hooks (public)
// ---------------------------------------------------------------------------

/**
 * Read terminal dimensions and fullscreen state from the nearest
 * `<FullScreen>` ancestor.
 *
 * When used outside a `<FullScreen>`, falls back to `process.stdout`
 * dimensions with `isFullScreen: false`.
 *
 * @returns Current fullscreen state including terminal dimensions.
 */
export function useFullScreen(): FullScreenState {
  const ctx = useContext(FullScreenContext)
  if (ctx) {
    return ctx
  }

  return {
    columns: process.stdout.columns ?? 80,
    isFullScreen: false,
    rows: process.stdout.rows ?? 24,
  }
}

/**
 * Track terminal dimensions with resize events.
 *
 * Standalone hook that does not depend on `<FullScreen>`. Listens for
 * the `resize` event on `process.stdout` and returns the current
 * columns and rows.
 *
 * @returns Current terminal size.
 */
export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(readTerminalSize)

  useEffect(() => {
    /**
     * Handle terminal resize events.
     *
     * @private
     */
    function handleResize(): void {
      setSize(readTerminalSize())
    }

    process.stdout.on('resize', handleResize)

    return () => {
      process.stdout.off('resize', handleResize)
    }
  }, [])

  return size
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Enter the terminal's alternate screen buffer while mounted.
 *
 * Wraps children in a `<Box>` that fills the terminal height. On mount,
 * writes the ANSI alternate-screen-enter sequence; on unmount (or
 * process exit), writes the leave sequence. All cleanup handlers are
 * idempotent.
 *
 * @param props - Component props including children and optional cursor hiding.
 * @returns A React element that renders children in fullscreen mode.
 */
export function FullScreen({ children, hideCursor = false }: FullScreenProps): ReactElement {
  const { write } = useStdout()
  const { columns, rows } = useTerminalSize()

  useEffect(() => {
    write(ENTER_ALT_SCREEN)

    if (hideCursor) {
      write(HIDE_CURSOR)
    }

    const handlers = createCleanupHandlers({
      hideCursor,
      write,
    })

    handlers.register()

    return () => {
      handlers.unregister()
      writeLeaveSequence({ hideCursor, write })
    }
  }, [write, hideCursor])

  const state: FullScreenState = Object.freeze({
    columns,
    isFullScreen: true,
    rows,
  })

  return (
    <FullScreenContext.Provider value={state}>
      <Box minHeight={rows}>{children}</Box>
    </FullScreenContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read the current terminal size from `process.stdout`.
 *
 * @private
 * @returns Terminal dimensions with sensible defaults.
 */
function readTerminalSize(): TerminalSize {
  return Object.freeze({
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  })
}

/**
 * Write the leave-fullscreen ANSI sequences.
 *
 * @private
 * @param opts - Options for the write.
 */
function writeLeaveSequence({
  hideCursor,
  write,
}: {
  readonly hideCursor: boolean
  readonly write: (data: string) => void
}): void {
  write(CLEAR_SCREEN)
  write(CURSOR_HOME)
  if (hideCursor) {
    write(SHOW_CURSOR)
  }
  write(LEAVE_ALT_SCREEN)
}

/**
 * Configuration for creating cleanup handlers.
 *
 * @private
 */
interface CleanupHandlerConfig {
  readonly hideCursor: boolean
  readonly write: (data: string) => void
}

/**
 * Handlers returned by {@link createCleanupHandlers}.
 *
 * @private
 */
interface CleanupHandlers {
  readonly register: () => void
  readonly unregister: () => void
}

/**
 * Create signal and process-exit handlers that leave the alternate screen
 * buffer on abnormal termination. All handlers are idempotent.
 *
 * @private
 * @param config - Configuration including write function and cursor visibility.
 * @returns Frozen object with `register` and `unregister` methods.
 */
function createCleanupHandlers(config: CleanupHandlerConfig): CleanupHandlers {
  /**
   * Handle SIGINT / SIGTERM — leave alt screen and re-raise.
   *
   * @private
   */
  function handleSignal(signal: NodeJS.Signals): void {
    writeLeaveSequence(config)
    process.kill(process.pid, signal)
  }

  /**
   * Handle process.exit — leave alt screen synchronously.
   *
   * @private
   */
  function handleExit(): void {
    writeLeaveSequence(config)
  }

  return Object.freeze({
    register: () => {
      process.on('SIGINT', handleSignal)
      process.on('SIGTERM', handleSignal)
      process.on('exit', handleExit)
    },
    unregister: () => {
      process.off('SIGINT', handleSignal)
      process.off('SIGTERM', handleSignal)
      process.off('exit', handleExit)
    },
  })
}
