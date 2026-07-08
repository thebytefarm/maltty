import { hasTag } from '@maltty/utils/tag'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import type { CommandContext, ScreenContext, Store } from '../context/types.js'

vi.mock(import('ink'), () => ({
  render: vi.fn(() => ({
    unmount: vi.fn(),
    waitUntilExit: vi.fn().mockResolvedValue(undefined),
  })),
}))

const { render: inkRender } = await import('ink')
const mockedInkRender = vi.mocked(inkRender)

function StubComponent(): null {
  return null
}

function makeStore(): Store {
  const map = new Map<string, unknown>()
  return {
    clear: () => map.clear(),
    delete: (key: string) => map.delete(key),
    get: (key: string) => map.get(key),
    has: (key: string) => map.has(key),
    set: (key: string, value: unknown) => map.set(key, value),
  } as Store
}

const baseMeta = Object.freeze({
  command: ['test'] as readonly string[],
  dirs: Object.freeze({ global: '.cli', local: '.cli' }),
  name: 'test-cli',
  version: '1.0.0',
})

function makeContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    args: {},
    colors: {} as CommandContext['colors'],
    config: {},
    fail: () => {
      throw new Error('fail')
    },
    format: {} as CommandContext['format'],
    log: {} as CommandContext['log'],
    meta: baseMeta,
    prompts: {} as CommandContext['prompts'],
    raw: Object.freeze({ argv: Object.freeze(['test-cli', 'test']) }),
    status: {} as CommandContext['status'],
    store: makeStore(),
    ...overrides,
  } as CommandContext
}

describe('screen()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return an object tagged as Command', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    expect(hasTag(cmd, 'Command')).toBeTruthy()
  })

  it('should set render on the command', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    expect(cmd.render).toBeDefined()
    expect(typeof cmd.render).toBe('function')
  })

  it('should not set handler on the command', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    expect(cmd.handler).toBeUndefined()
  })

  it('should preserve the description', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ description: 'Live dashboard', render: StubComponent })
    expect(cmd.description).toBe('Live dashboard')
  })

  it('should resolve a description function', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ description: () => 'computed', render: StubComponent })
    expect(cmd.description).toBe('computed')
  })

  it('should preserve options', async () => {
    const { screen } = await import('./screen.js')
    const options = z.object({ env: z.string().default('staging') })
    const cmd = screen({ options, render: StubComponent })
    expect(cmd.options).toBe(options)
  })

  it('should preserve positionals', async () => {
    const { screen } = await import('./screen.js')
    const positionals = z.object({ name: z.string() })
    const cmd = screen({ positionals, render: StubComponent })
    expect(cmd.positionals).toBe(positionals)
  })

  it('should preserve name and aliases', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ aliases: ['d'], name: 'dash', render: StubComponent })
    expect(cmd.name).toBe('dash')
    expect(cmd.aliases).toEqual(['d'])
  })

  it('should resolve hidden as a static value', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ hidden: true, render: StubComponent })
    expect(cmd.hidden).toBeTruthy()
  })

  it('should resolve hidden as a function', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ hidden: () => true, render: StubComponent })
    expect(cmd.hidden).toBeTruthy()
  })

  it('should resolve deprecated as a static string', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ deprecated: 'Use v2', render: StubComponent })
    expect(cmd.deprecated).toBe('Use v2')
  })

  it('should resolve deprecated as a function', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ deprecated: () => 'removed', render: StubComponent })
    expect(cmd.deprecated).toBe('removed')
  })

  it('should default hidden and deprecated to undefined when omitted', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    expect(cmd.hidden).toBeUndefined()
    expect(cmd.deprecated).toBeUndefined()
  })
})

describe('screen() render function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call ink render when invoked', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })

    await cmd.render!(makeContext())

    expect(mockedInkRender).toHaveBeenCalledOnce()
  })

  it('should pass args as props to the component', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    const args = { env: 'production', verbose: true }

    await cmd.render!(makeContext({ args }))

    const rendered = mockedInkRender.mock.calls[0]![0] as React.ReactElement
    const providerChildren = rendered.props.children as React.ReactElement
    expect(providerChildren.props).toMatchObject(args)
  })

  it('should wrap component in MalttyProvider with a ScreenContext', async () => {
    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    const ctx = makeContext({ config: { debug: true } })

    await cmd.render!(ctx)

    const rendered = mockedInkRender.mock.calls[0]![0] as React.ReactElement
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue.config).toEqual({ debug: true })
    expect(providerValue.meta).toBe(baseMeta)
    expect(providerValue).toHaveProperty('log')
    expect(providerValue).toHaveProperty('status')
    expect(providerValue).not.toHaveProperty('prompts')
    expect(providerValue).not.toHaveProperty('fail')
    expect(providerValue).not.toHaveProperty('colors')
    expect(providerValue).not.toHaveProperty('format')
  })

  it('should wait until exit', async () => {
    const waitUntilExit = vi.fn().mockResolvedValue(undefined)
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit,
    } as never)

    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })

    await cmd.render!(makeContext())

    expect(waitUntilExit).toHaveBeenCalledOnce()
  })

  it('should not unmount immediately in manual exit mode', async () => {
    const unmount = vi.fn()
    mockedInkRender.mockReturnValue({
      unmount,
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })

    await cmd.render!(makeContext())

    expect(unmount).not.toHaveBeenCalled()
  })

  it('should schedule unmount in auto exit mode', async () => {
    vi.useFakeTimers()
    const unmount = vi.fn()
    mockedInkRender.mockReturnValue({
      unmount,
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const { screen } = await import('./screen.js')
    const cmd = screen({ exit: 'auto', render: StubComponent })

    const renderPromise = cmd.render!(makeContext())

    // Flush microtasks (dynamic import) and timers (setTimeout in auto-exit)
    await vi.advanceTimersByTimeAsync(0)
    expect(unmount).toHaveBeenCalledOnce()

    await renderPromise
    vi.useRealTimers()
  })

  it('should wrap component in FullScreen when fullscreen is true', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({ fullscreen: true, render: StubComponent })

    await cmd.render!(makeContext())

    // After waitUntilExit, LEAVE_ALT_SCREEN should be written
    expect(writeSpy).toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })

  it('should not write LEAVE_ALT_SCREEN when fullscreen is false', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({ fullscreen: false, render: StubComponent })

    await cmd.render!(makeContext())

    expect(writeSpy).not.toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })

  it('should inject report into screen context when report exists on ctx', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })
    const ctx = makeContext()
    const ctxWithReport = {
      ...ctx,
      report: { check: vi.fn(), finding: vi.fn(), summary: vi.fn() },
    }

    await cmd.render!(ctxWithReport)

    const rendered = mockedInkRender.mock.calls[0]![0] as React.ReactElement
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue).toHaveProperty('report')
  })

  it('should not inject report into screen context when report is absent', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const { screen } = await import('./screen.js')
    const cmd = screen({ render: StubComponent })

    await cmd.render!(makeContext())

    const rendered = mockedInkRender.mock.calls[0]![0] as React.ReactElement
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue).not.toHaveProperty('report')
  })

  it('should resolve fullscreen from a sync function', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({
      fullscreen: () => true,
      render: StubComponent,
    })

    await cmd.render!(makeContext())

    expect(writeSpy).toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })

  it('should resolve fullscreen from an async function', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({
      fullscreen: async () => true,
      render: StubComponent,
    })

    await cmd.render!(makeContext())

    expect(writeSpy).toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })

  it('should not enter fullscreen when resolver returns false', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({
      fullscreen: () => false,
      render: StubComponent,
    })

    await cmd.render!(makeContext())

    expect(writeSpy).not.toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })

  it('should pass ScreenContext to fullscreen resolver', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    } as never)

    const resolver = vi.fn().mockReturnValue(false)

    const { screen } = await import('./screen.js')
    const cmd = screen({
      fullscreen: resolver,
      render: StubComponent,
    })

    const ctx = makeContext({ args: { compact: true } })
    await cmd.render!(ctx)

    expect(resolver).toHaveBeenCalledOnce()
    const receivedCtx = resolver.mock.calls[0]![0] as ScreenContext
    expect(receivedCtx.args).toMatchObject({ compact: true })
    expect(receivedCtx).not.toHaveProperty('fail')
    expect(receivedCtx).not.toHaveProperty('prompts')
  })

  it('should write LEAVE_ALT_SCREEN even when waitUntilExit rejects in fullscreen mode', async () => {
    mockedInkRender.mockReturnValue({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockRejectedValue(new Error('exit error')),
    } as never)

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const { screen } = await import('./screen.js')
    const cmd = screen({ fullscreen: true, render: StubComponent })

    await expect(cmd.render!(makeContext())).rejects.toThrow('exit error')

    expect(writeSpy).toHaveBeenCalledWith('\u001B[?1049l')
    writeSpy.mockRestore()
  })
})
