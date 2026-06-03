import { hasTag } from '@maltty/utils/tag'
import defaultFigures from 'figures'
import { describe, expect, it, vi } from 'vitest'

import { figures } from './figures.js'

function createMockCtx() {
  const store = new Map()

  return {
    args: {},
    config: {},
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
    colors: {},
    format: { json: vi.fn(), table: vi.fn() },
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
    meta: {
      command: ['test'],
      dirs: { global: '.test-cli', local: '.test-cli' },
      name: 'test-cli',
      version: '1.0.0',
    },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

describe('figures()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = figures()

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.figures with default figures', async () => {
    const ctx = createMockCtx()
    const mw = figures()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const figuresCtx = (ctx as Record<string, unknown>)['figures'] as Record<string, string>
    expect(figuresCtx).toBe(defaultFigures)
  })

  it('should use custom figures when provided', async () => {
    const custom = Object.freeze({ tick: 'Y', cross: 'N' })
    const ctx = createMockCtx()
    const mw = figures({ figures: custom })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const figuresCtx = (ctx as Record<string, unknown>)['figures'] as Record<string, string>
    expect(figuresCtx).toBe(custom)
  })

  it('should expose tick and cross symbols', async () => {
    const ctx = createMockCtx()
    const mw = figures()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const figuresCtx = (ctx as Record<string, unknown>)['figures'] as Record<string, string>
    expect(figuresCtx['tick']).toBe(defaultFigures.tick)
    expect(figuresCtx['cross']).toBe(defaultFigures.cross)
  })

  it('should use default figures when options object is provided without figures property', async () => {
    const ctx = createMockCtx()
    const mw = figures({})
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const figuresCtx = (ctx as Record<string, unknown>)['figures'] as Record<string, string>
    expect(figuresCtx).toBe(defaultFigures)
  })

  it('should use default figures when options.figures is undefined', async () => {
    const ctx = createMockCtx()
    const mw = figures({ figures: undefined })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const figuresCtx = (ctx as Record<string, unknown>)['figures'] as Record<string, string>
    expect(figuresCtx).toBe(defaultFigures)
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const mw = figures()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
