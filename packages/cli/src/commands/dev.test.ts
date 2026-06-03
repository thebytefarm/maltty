import type { CommandContext } from '@maltty/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWatch = vi.fn()

vi.mock(import('@maltty/bundler'), () => ({
  createBundler: vi.fn(async () => ({
    build: vi.fn(),
    compile: vi.fn(),
    watch: mockWatch,
  })),
}))

vi.mock(import('@maltty/config/utils'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('@maltty/core'), () => ({
  command: vi.fn((def) => def),
}))

const { createBundler } = await import('@maltty/bundler')
const { loadConfig } = await import('@maltty/config/utils')
const mockedCreateBundler = vi.mocked(createBundler)
const mockedLoadConfig = vi.mocked(loadConfig)

function makeContext(): CommandContext {
  return {
    args: {},
    config: {},
    fail: vi.fn(),
    format: { json: vi.fn(() => ''), table: vi.fn(() => '') },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      raw: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['dev'], name: 'maltty', version: '0.0.0' },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('dev command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateBundler.mockResolvedValue({
      build: vi.fn(),
      compile: vi.fn(),
      watch: mockWatch,
    })
  })

  it('should start spinner with dev server message', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockWatch.mockResolvedValue([null, undefined] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.status.spinner.start).toHaveBeenCalledWith('Starting dev server...')
  })

  it('should stop spinner with watching message on first build success', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockWatch.mockImplementation(async (opts) => {
      if (opts?.onSuccess) {
        opts.onSuccess()
      }
      return [null, undefined] as never
    })

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Watching for changes...')
  })

  it('should log rebuilt successfully on subsequent builds', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockWatch.mockImplementation(async (opts) => {
      if (opts?.onSuccess) {
        opts.onSuccess()
        opts.onSuccess()
      }
      return [null, undefined] as never
    })

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.success).toHaveBeenCalledWith('Rebuilt successfully')
  })

  it('should call fail when watch returns an error', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockWatch.mockResolvedValue([new Error('tsdown watch failed'), null] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Watch failed')
    expect(ctx.fail).toHaveBeenCalledWith('tsdown watch failed')
  })

  it('should use empty config when loadConfig returns error', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
    mockWatch.mockResolvedValue([null, undefined] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(mockedCreateBundler).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
  })
})
