import { hasTag } from '@maltty/utils/tag'
import { describe, expect, it, vi } from 'vitest'

import { compose } from './compose.js'
import { decorateContext } from './context/decorate.js'
import { middleware } from './middleware.js'

function createMockCtx() {
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
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    store: {
      clear: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
    },
  }
}

describe('compose()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = compose([])

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should execute middleware in order', async () => {
    const order: number[] = []

    const first = middleware((_ctx, next) => {
      order.push(1)
      return next()
    })

    const second = middleware((_ctx, next) => {
      order.push(2)
      return next()
    })

    const third = middleware((_ctx, next) => {
      order.push(3)
      return next()
    })

    const composed = compose([first, second, third])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(order).toEqual([1, 2, 3])
  })

  it('should call next() after all composed middleware', async () => {
    const mw1 = middleware((_ctx, next) => next())
    const mw2 = middleware((_ctx, next) => next())

    const composed = compose([mw1, mw2])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should short-circuit when a middleware does not call next()', async () => {
    const order: number[] = []

    const first = middleware((_ctx, next) => {
      order.push(1)
      return next()
    })

    const blocker = middleware(() => {
      order.push(2)
      // Does NOT call next()
    })

    const third = middleware((_ctx, next) => {
      order.push(3)
      return next()
    })

    const composed = compose([first, blocker, third])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(order).toEqual([1, 2])
    expect(next).not.toHaveBeenCalled()
  })

  it('should propagate context decorations through the chain', async () => {
    const addUser = middleware((ctx, next) => {
      decorateContext(ctx, 'user', { name: 'Alice' })
      return next()
    })

    const checkUser = middleware((ctx, next) => {
      const user = (ctx as Record<string, unknown>)['user'] as { name: string }
      expect(user.name).toBe('Alice')
      return next()
    })

    const composed = compose([addUser, checkUser])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should handle empty array', async () => {
    const composed = compose([])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should handle single-element array', async () => {
    const single = middleware((_ctx, next) => next())

    const composed = compose([single])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should call next when middleware array contains undefined entry', async () => {
    const order: number[] = []

    const first = middleware((_ctx, next) => {
      order.push(1)
      return next()
    })

    const third = middleware((_ctx, next) => {
      order.push(3)
      return next()
    })

    const middlewares = [first, undefined, third] as unknown as Parameters<typeof compose>[0]
    const composed = compose(middlewares)
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)

    expect(order).toEqual([1])
    expect(next).toHaveBeenCalledOnce()
  })

  it('should call downstream next exactly once with empty array', async () => {
    const composed = compose([])
    const ctx = createMockCtx()
    const next = vi.fn()

    await composed.handler(ctx as never, next)
    await composed.handler(ctx as never, next)

    expect(next).toHaveBeenCalledTimes(2)
  })

  it('should handle async middleware that awaits next', async () => {
    const order: string[] = []

    const asyncMw = middleware(async (_ctx, next) => {
      order.push('before')
      await next()
      order.push('after')
    })

    const composed = compose([asyncMw])
    const ctx = createMockCtx()
    const next = vi.fn(async () => {
      order.push('downstream')
    })

    await composed.handler(ctx as never, next)

    expect(order).toEqual(['before', 'downstream', 'after'])
  })
})
