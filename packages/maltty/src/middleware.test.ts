import { TAG, hasTag } from '@maltty/utils/tag'
import { describe, expect, it } from 'vitest'

import { middleware } from './middleware.js'

describe('middleware()', () => {
  it('returns an object tagged as Middleware', () => {
    const mw = middleware(async (_ctx, next) => {
      await next()
    })
    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('preserves the handler function', () => {
    async function handler(_ctx: unknown, next: () => Promise<void>): Promise<void> {
      await next()
    }
    const mw = middleware(handler)
    expect(mw.handler).toBe(handler)
  })

  it('works with a synchronous handler', () => {
    function handler(_ctx: unknown, _next: () => Promise<void>): void {}
    const mw = middleware(handler)
    expect(mw[TAG]).toBe('Middleware')
    expect(mw.handler).toBe(handler)
  })

  it('handler is callable', async () => {
    let called = false
    const mw = middleware(async (_ctx, next) => {
      called = true
      await next()
    })

    await mw.handler({} as never, async () => {})
    expect(called).toBeTruthy()
  })
})
