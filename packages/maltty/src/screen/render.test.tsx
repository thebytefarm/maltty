import type { ReactElement } from 'react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CommandContext, ScreenContext, Store } from '../context/types.js'

// oxlint-disable-next-line jest(prefer-ending-with-an-expect) -- vi.mock factory is module setup, not a test block
vi.mock(import('ink'), () => ({
  render: vi.fn<() => unknown>(() => ({
    cleanup: vi.fn<() => void>(),
    clear: vi.fn<() => void>(),
    rerender: vi.fn<() => void>(),
    unmount: vi.fn<() => void>(),
    waitUntilExit: vi.fn<() => Promise<undefined>>().mockResolvedValue(undefined),
  })),
  renderToString: vi.fn<() => string>(() => 'rendered-output'),
}))

const ink = await import('ink')
const mockedInkRender = vi.mocked(ink.render)
const mockedInkRenderToString = vi.mocked(ink.renderToString)

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

describe('render() helper', () => {
  it('should call ink render and return an instance', async () => {
    vi.clearAllMocks()
    const { render } = await import('./render.js')
    const instance = await render(<StubComponent />, makeContext())

    expect(mockedInkRender).toHaveBeenCalledOnce()
    expect(instance).toHaveProperty('waitUntilExit')
    expect(instance).toHaveProperty('unmount')
  })

  it('should wrap node in MalttyProvider with ScreenContext', async () => {
    vi.clearAllMocks()
    const { render } = await import('./render.js')
    const ctx = makeContext({ config: { debug: true } })

    await render(<StubComponent />, ctx)

    const [firstCall] = mockedInkRender.mock.calls
    const [rendered] = firstCall as [ReactElement]
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue.config).toStrictEqual({ debug: true })
    expect(providerValue).toHaveProperty('log')
    expect(providerValue).not.toHaveProperty('fail')
    expect(providerValue).not.toHaveProperty('prompts')
  })

  it('should pass render options through to ink', async () => {
    vi.clearAllMocks()
    const { render } = await import('./render.js')
    const options = { debug: true }

    await render(<StubComponent />, makeContext(), options)

    expect(mockedInkRender).toHaveBeenCalledWith(expect.anything(), options)
  })
})

describe('renderToString() helper', () => {
  it('should call ink renderToString and return a string', async () => {
    vi.clearAllMocks()
    const { renderToString } = await import('./render.js')
    const result = await renderToString(<StubComponent />, makeContext())

    expect(mockedInkRenderToString).toHaveBeenCalledOnce()
    expect(result).toBe('rendered-output')
  })

  it('should wrap node in MalttyProvider with ScreenContext', async () => {
    vi.clearAllMocks()
    const { renderToString } = await import('./render.js')
    const ctx = makeContext({ config: { theme: 'dark' } })

    await renderToString(<StubComponent />, ctx)

    const [firstCall] = mockedInkRenderToString.mock.calls
    const [rendered] = firstCall as [ReactElement]
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue.config).toStrictEqual({ theme: 'dark' })
    expect(providerValue).not.toHaveProperty('colors')
    expect(providerValue).not.toHaveProperty('format')
  })

  it('should pass options through to ink renderToString', async () => {
    vi.clearAllMocks()
    const { renderToString } = await import('./render.js')
    const options = { columns: 120 }

    await renderToString(<StubComponent />, makeContext(), options)

    expect(mockedInkRenderToString).toHaveBeenCalledWith(expect.anything(), options)
  })
})
