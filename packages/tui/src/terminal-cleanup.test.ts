import { describe, expect, it, vi } from 'vitest'

import type { TerminalCleanupHost } from './terminal-cleanup.js'
import { createTerminalCleanupCoordinator, terminalCleanup } from './terminal-cleanup.js'

function createHost() {
  const exitHandlers = new Set<() => void>()
  const signalHandlers = new Map<NodeJS.Signals, (signal: NodeJS.Signals) => void>()
  const terminate = vi.fn<(signal: NodeJS.Signals) => void>((signal) => {
    signalHandlers.get(signal)?.(signal)
  })
  const host: TerminalCleanupHost = {
    addExitHandler: (handler) => exitHandlers.add(handler),
    addSignalHandler: (signal, handler) => signalHandlers.set(signal, handler),
    removeExitHandler: (handler) => exitHandlers.delete(handler),
    removeSignalHandler: (signal) => signalHandlers.delete(signal),
    terminate,
  }
  return { exitHandlers, host, signalHandlers, terminate }
}

describe(createTerminalCleanupCoordinator, () => {
  it.each(['SIGINT', 'SIGTERM'] as const)(
    'should run every cleanup before terminating for %s once',
    (signal) => {
      const fixture = createHost()
      const coordinator = createTerminalCleanupCoordinator({ host: fixture.host })
      const first = vi.fn()
      const second = vi.fn()
      coordinator.register(first)
      coordinator.register(second)

      fixture.signalHandlers.get(signal)?.(signal)

      expect(first).toHaveBeenCalledOnce()
      expect(second).toHaveBeenCalledOnce()
      expect(fixture.terminate).toHaveBeenCalledOnce()
      expect(fixture.terminate).toHaveBeenCalledWith(signal)
      expect(fixture.signalHandlers.size).toBe(0)
      expect(fixture.exitHandlers.size).toBe(0)
    }
  )

  it('should register the same cleanup idempotently', () => {
    const fixture = createHost()
    const coordinator = createTerminalCleanupCoordinator({ host: fixture.host })
    const cleanup = vi.fn()
    coordinator.register(cleanup)
    coordinator.register(cleanup)

    ;[...fixture.exitHandlers].map((handler) => handler())

    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('should continue cleanup and terminate when one callback fails', () => {
    const fixture = createHost()
    const coordinator = createTerminalCleanupCoordinator({ host: fixture.host })
    const failing = vi.fn<() => void>(() => {
      decodeURIComponent('%')
    })
    const succeeding = vi.fn()
    coordinator.register(failing)
    coordinator.register(succeeding)

    fixture.signalHandlers.get('SIGTERM')?.('SIGTERM')

    expect(failing).toHaveBeenCalledOnce()
    expect(succeeding).toHaveBeenCalledOnce()
    expect(fixture.terminate).toHaveBeenCalledOnce()
  })

  it('should remove host handlers after the last cleanup is unregistered', () => {
    const fixture = createHost()
    const coordinator = createTerminalCleanupCoordinator({ host: fixture.host })
    const first = vi.fn()
    const second = vi.fn()
    coordinator.register(first)
    coordinator.register(second)
    coordinator.unregister(first)

    expect(fixture.signalHandlers.size).toBe(2)

    coordinator.unregister(second)

    expect(fixture.signalHandlers.size).toBe(0)
    expect(fixture.exitHandlers.size).toBe(0)
  })
})

describe('node terminal cleanup', () => {
  it('should terminate after a bounded delay when stdout does not flush', async () => {
    vi.useFakeTimers()
    const existingHandlers = new Set(process.listeners('SIGTERM'))
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const cleanup = vi.fn()
    terminalCleanup.register(cleanup)
    const handler = process
      .listeners('SIGTERM')
      .findLast((candidate) => !existingHandlers.has(candidate)) as (signal: NodeJS.Signals) => void

    handler('SIGTERM')
    await vi.advanceTimersByTimeAsync(100)

    expect(cleanup).toHaveBeenCalledOnce()
    expect(exit).toHaveBeenCalledOnce()
    expect(exit).toHaveBeenCalledWith(143)

    terminalCleanup.unregister(cleanup)
    write.mockRestore()
    exit.mockRestore()
    vi.useRealTimers()
  })
})
