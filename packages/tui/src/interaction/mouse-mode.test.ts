import { describe, expect, it, vi } from 'vitest'

import type { TerminalCleanupCoordinator } from '../terminal-cleanup.js'
import {
  createMouseModeLifecycle,
  DISABLE_BUTTON_MOUSE,
  DISABLE_SGR_MOUSE,
  ENABLE_BUTTON_MOUSE,
  ENABLE_SGR_MOUSE,
} from './mouse-mode.js'

function createCleanupCoordinator() {
  const cleanups = new Set<() => void>()
  const cleanupCoordinator: TerminalCleanupCoordinator = {
    register: (cleanup) => cleanups.add(cleanup),
    unregister: (cleanup) => cleanups.delete(cleanup),
  }
  return { cleanupCoordinator, cleanups }
}

describe(createMouseModeLifecycle, () => {
  it('should enable and disable mouse modes symmetrically', () => {
    const write = vi.fn<(data: string) => void>()
    const lifecycle = createMouseModeLifecycle({
      cleanupCoordinator: createCleanupCoordinator().cleanupCoordinator,
      write,
    })

    lifecycle.enable()
    lifecycle.disable()

    expect(write.mock.calls.map(([data]) => data)).toStrictEqual([
      ENABLE_BUTTON_MOUSE,
      ENABLE_SGR_MOUSE,
      DISABLE_SGR_MOUSE,
      DISABLE_BUTTON_MOUSE,
    ])
  })

  it('should register mouse restoration with terminal cleanup', () => {
    const write = vi.fn<(data: string) => void>()
    const fixture = createCleanupCoordinator()
    const lifecycle = createMouseModeLifecycle({
      cleanupCoordinator: fixture.cleanupCoordinator,
      write,
    })
    lifecycle.registerCleanup()

    ;[...fixture.cleanups].map((cleanup) => cleanup())

    expect(write.mock.calls.map(([data]) => data)).toStrictEqual([
      DISABLE_SGR_MOUSE,
      DISABLE_BUTTON_MOUSE,
    ])
  })

  it('should make repeated cleanup registration idempotent', () => {
    const fixture = createCleanupCoordinator()
    const lifecycle = createMouseModeLifecycle({
      cleanupCoordinator: fixture.cleanupCoordinator,
      write: vi.fn(),
    })
    lifecycle.registerCleanup()
    lifecycle.registerCleanup()

    expect(fixture.cleanups.size).toBe(1)
  })

  it('should unregister every cleanup handler', () => {
    const fixture = createCleanupCoordinator()
    const lifecycle = createMouseModeLifecycle({
      cleanupCoordinator: fixture.cleanupCoordinator,
      write: vi.fn(),
    })
    lifecycle.registerCleanup()
    lifecycle.unregisterCleanup()

    expect(fixture.cleanups.size).toBe(0)
  })
})
