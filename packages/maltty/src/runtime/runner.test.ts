import { runTestCli, setArgv, setupTestLifecycle } from '@test/index.js'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import type { CommandContext } from '@/context/types.js'
import { middleware } from '@/middleware.js'
import type { CommandMap } from '@/types/index.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  multiselect: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

const { getExitSpy } = setupTestLifecycle()

describe('middleware()', () => {
  it('executes middleware in order before the handler', async () => {
    const order: string[] = []
    const handler = vi.fn(() => {
      order.push('handler')
    })

    const mw1 = middleware(async (_ctx, next) => {
      order.push('mw1:before')
      await next()
      order.push('mw1:after')
    })

    const mw2 = middleware(async (_ctx, next) => {
      order.push('mw2:before')
      await next()
      order.push('mw2:after')
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      middleware: [mw1, mw2],
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(order).toEqual(['mw1:before', 'mw2:before', 'handler', 'mw2:after', 'mw1:after'])
  })

  it('middleware can short-circuit by not calling next', async () => {
    const handler = vi.fn()

    const blocker = middleware(async (_ctx, _next) => {
      // Intentionally not calling next
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      middleware: [blocker],
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('middleware receives the context', async () => {
    const receivedCtx: CommandContext[] = []

    const mw = middleware(async (ctx, next) => {
      receivedCtx.push(ctx)
      await next()
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler: vi.fn(),
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      middleware: [mw],
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(receivedCtx).toHaveLength(1)
    expect(receivedCtx[0]).toHaveProperty('meta')
    expect(receivedCtx[0]).toHaveProperty('args')
  })

  it('works with no middleware', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('executes command middleware inside root middleware', async () => {
    const order: string[] = []

    const rootMw = middleware(async (_ctx, next) => {
      order.push('root:before')
      await next()
      order.push('root:after')
    })

    const cmdMw = middleware(async (_ctx, next) => {
      order.push('cmd:before')
      await next()
      order.push('cmd:after')
    })

    const handler = vi.fn(() => {
      order.push('handler')
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
        middleware: [cmdMw],
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      middleware: [rootMw],
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(order).toEqual(['root:before', 'cmd:before', 'handler', 'cmd:after', 'root:after'])
  })

  it('command middleware runs without root middleware', async () => {
    const order: string[] = []

    const cmdMw = middleware(async (_ctx, next) => {
      order.push('cmd:before')
      await next()
      order.push('cmd:after')
    })

    const handler = vi.fn(() => {
      order.push('handler')
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
        middleware: [cmdMw],
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(order).toEqual(['cmd:before', 'handler', 'cmd:after'])
  })

  it('command middleware can short-circuit the handler', async () => {
    const handler = vi.fn()

    const blocker = middleware(async (_ctx, _next) => {
      // Intentionally not calling next
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
        middleware: [blocker],
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('error handling', () => {
  it('exits with code 1 when handler throws', async () => {
    const commands: CommandMap = {
      fail: command({
        description: 'Fail',
        handler: () => {
          throw new Error('Something went wrong')
        },
      }),
    }

    setArgv('fail')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(getExitSpy()).toHaveBeenCalledWith(1)
  })

  it('exits with custom exit code from ContextError', async () => {
    const { createContextError } = await import('@/context/index.js')

    const commands: CommandMap = {
      fail: command({
        description: 'Fail',
        handler: () => {
          throw createContextError('Custom exit', { exitCode: 42 })
        },
      }),
    }

    setArgv('fail')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(getExitSpy()).toHaveBeenCalledWith(42)
  })

  it('exits with code 1 when middleware throws', async () => {
    const mw = middleware(async () => {
      throw new Error('Middleware error')
    })

    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler: vi.fn(),
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      middleware: [mw],
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(getExitSpy()).toHaveBeenCalledWith(1)
  })

  it('handles string commands (autoload path) with an error', async () => {
    setArgv('run')
    await runTestCli({
      commands: './commands',
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(getExitSpy()).toHaveBeenCalledWith(1)
  })
})
