import type { TerminalCleanupCoordinator } from '../terminal-cleanup.js'
import { terminalCleanup } from '../terminal-cleanup.js'

/**
 * Enable basic button press and release reporting.
 */
export const ENABLE_BUTTON_MOUSE = '\u001B[?1000h'

/**
 * Disable basic button press and release reporting.
 */
export const DISABLE_BUTTON_MOUSE = '\u001B[?1000l'

/**
 * Enable modern SGR mouse coordinates.
 */
export const ENABLE_SGR_MOUSE = '\u001B[?1006h'

/**
 * Disable modern SGR mouse coordinates.
 */
export const DISABLE_SGR_MOUSE = '\u001B[?1006l'

/**
 * Lifecycle controls for terminal mouse modes.
 */
export interface MouseModeLifecycle {
  readonly disable: () => void
  readonly enable: () => void
  readonly registerCleanup: () => void
  readonly unregisterCleanup: () => void
}

/**
 * Create a symmetric SGR mouse-mode lifecycle at the terminal boundary.
 *
 * Repeated enable and disable sequences are safe at the terminal protocol
 * level. Cleanup handlers disable mouse reporting before terminating,
 * preventing a crashed application from leaving the user's terminal noisy.
 *
 * @param options - Terminal writer and optionally an injectable process host.
 * @returns Frozen lifecycle methods for mount and process cleanup.
 */
export function createMouseModeLifecycle({
  cleanupCoordinator = terminalCleanup,
  write,
}: {
  readonly cleanupCoordinator?: TerminalCleanupCoordinator
  readonly write: (data: string) => void
}): MouseModeLifecycle {
  /**
   * @private
   */
  function disable(): void {
    write(DISABLE_SGR_MOUSE)
    write(DISABLE_BUTTON_MOUSE)
  }

  /**
   * @private
   */
  function enable(): void {
    write(ENABLE_BUTTON_MOUSE)
    write(ENABLE_SGR_MOUSE)
  }

  /**
   * @private
   */
  return Object.freeze({
    disable,
    enable,
    registerCleanup: () => cleanupCoordinator.register(disable),
    unregisterCleanup: () => cleanupCoordinator.unregister(disable),
  })
}
