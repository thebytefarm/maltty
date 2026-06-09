import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommandContext } from '@/context/types.js'

import type { ResolvedExecution } from './types.js'

vi.mock(import('@/context/index.js'), () => ({
  createContext: vi.fn(() => ({ mock: 'context' })),
}))

vi.mock(import('./args/index.js'), () => ({
  createArgsParser: vi.fn(),
}))

vi.mock(import('./runner.js'), () => ({
  createMiddlewareExecutor: vi.fn(),
}))

const { createContext } = await import('@/context/index.js')
const { createArgsParser } = await import('./args/index.js')
const { createMiddlewareExecutor } = await import('./runner.js')

const mockedCreateContext = vi.mocked(createContext)
const mockedCreateArgsParser = vi.mocked(createArgsParser)
const mockedCreateRunner = vi.mocked(createMiddlewareExecutor)

function makeExecution(overrides: Partial<ResolvedExecution> = {}): ResolvedExecution {
  return {
    commandPath: ['test'],
    handler: vi.fn(),
    middleware: [],
    options: undefined,
    positionals: undefined,
    rawArgs: {},
    ...overrides,
  }
}

function setupDefaults(): void {
  mockedCreateArgsParser.mockReturnValue({
    parse: vi.fn().mockReturnValue([null, { verbose: true }]),
  })
  mockedCreateRunner.mockReturnValue({
    execute: vi.fn().mockResolvedValue(undefined),
  })
  mockedCreateContext.mockReturnValue({ mock: 'context' } as unknown as CommandContext)
}

describe('createRuntime()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ok result on successful creation', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [error, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    expect(error).toBeNull()
    expect(runtime).toBeDefined()
    expect(runtime).toHaveProperty('execute')
  })

  it('should return err when arg parsing fails', async () => {
    setupDefaults()
    mockedCreateArgsParser.mockReturnValue({
      parse: vi.fn().mockReturnValue([new Error('Invalid arguments'), null]),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeInstanceOf(Error)
    expect(execError!.message).toBe('Invalid arguments')
  })

  it('should use noop handler when handler is undefined', async () => {
    const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
    setupDefaults()
    mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution({ handler: undefined })
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeNull()
    expect(mockRunnerExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        handler: expect.any(Function),
      })
    )

    const passedHandler = mockRunnerExecute.mock.calls[0][0].handler as (
      ctx: CommandContext
    ) => Promise<void>
    await expect(passedHandler({} as CommandContext)).resolves.toBeUndefined()
  })

  it('should return err when runner.execute throws', async () => {
    setupDefaults()
    mockedCreateRunner.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error('Middleware blew up')),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeInstanceOf(Error)
    expect(execError!.message).toBe('Middleware blew up')
  })

  it('should pass validated args and meta to createContext', async () => {
    const validatedArgs = { file: 'index.ts', verbose: true }
    setupDefaults()
    mockedCreateArgsParser.mockReturnValue({
      parse: vi.fn().mockReturnValue([null, validatedArgs]),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '2.0.0',
    })

    const execution = makeExecution({ commandPath: ['build', 'all'] })
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith({
      args: validatedArgs,
      meta: {
        command: ['build', 'all'],
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '2.0.0',
      },
    })
  })

  it('should pass command middleware to runner.execute', async () => {
    const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
    setupDefaults()
    mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

    const commandMiddleware = [{ handler: vi.fn() }]

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution({ middleware: commandMiddleware as never })
    await runtime!.execute(execution)

    expect(mockRunnerExecute).toHaveBeenCalledWith(
      expect.objectContaining({ middleware: commandMiddleware })
    )
  })

  it('should return ok result on successful execution', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeNull()
  })

  describe('render execution', () => {
    it('should pass render as the handler to runner.execute', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })
      const renderFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: undefined, render: renderFn })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeNull()
      expect(mockRunnerExecute).toHaveBeenCalledWith(expect.objectContaining({ handler: renderFn }))
    })

    it('should run render through middleware runner', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })
      const renderFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const commandMiddleware = [{ handler: vi.fn() }]
      const execution = makeExecution({
        handler: vi.fn(),
        middleware: commandMiddleware as never,
        render: renderFn,
      })
      await runtime!.execute(execution)

      expect(mockRunnerExecute).toHaveBeenCalledOnce()
      expect(mockRunnerExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          handler: renderFn,
          middleware: commandMiddleware,
        })
      )
    })

    it('should prefer render over handler when both are present', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })
      const renderFn = vi.fn().mockResolvedValue(undefined)
      const handlerFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: handlerFn, render: renderFn })
      await runtime!.execute(execution)

      expect(mockRunnerExecute).toHaveBeenCalledWith(expect.objectContaining({ handler: renderFn }))
    })

    it('should return err when render throws', async () => {
      setupDefaults()
      const renderFn = vi.fn().mockRejectedValue(new Error('Render failed'))
      mockedCreateRunner.mockReturnValue({
        execute: vi
          .fn()
          .mockImplementation(async (opts: { handler: (ctx: CommandContext) => Promise<void> }) =>
            opts.handler({} as CommandContext)
          ),
      })

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: undefined, render: renderFn })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeInstanceOf(Error)
      expect(execError!.message).toBe('Render failed')
    })

    it('should fall through to handler when render is undefined', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const handler = vi.fn()
      const execution = makeExecution({ handler, render: undefined })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeNull()
      expect(mockRunnerExecute).toHaveBeenCalledWith(expect.objectContaining({ handler }))
    })
  })
})
