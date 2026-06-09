import { describe, expect, it } from 'vitest'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { middleware } from '@/middleware.js'

import { runMiddleware } from './middleware.js'

describe('run middleware utility', () => {
  it('should execute a single middleware', async () => {
    const mw = middleware(async (ctx, next) => {
      ctx.log.raw('middleware ran')
      await next()
    })

    const { stdout } = await runMiddleware({ middlewares: [mw] })
    expect(stdout()).toBe('middleware ran\n')
  })

  it('should execute middleware in order', async () => {
    const first = middleware(async (ctx, next) => {
      ctx.log.raw('first')
      await next()
    })

    const second = middleware(async (ctx, next) => {
      ctx.log.raw('second')
      await next()
    })

    const { stdout } = await runMiddleware({ middlewares: [first, second] })
    expect(stdout()).toBe('first\nsecond\n')
  })

  it('should allow middleware to decorate context', async () => {
    const mw = middleware<{ Variables: { user: string } }>(async (ctx, next) => {
      decorateContext(ctx, 'user', 'Alice')
      await next()
    })

    const { ctx } = await runMiddleware({ middlewares: [mw] })
    const decorated = ctx as CommandContext & Readonly<{ user: string }>
    expect(decorated.user).toBe('Alice')
  })

  it('should handle empty middleware array', async () => {
    const { ctx } = await runMiddleware({ middlewares: [] })
    expect(ctx.args).toEqual({})
  })

  it('should accept context overrides', async () => {
    const mw = middleware(async (ctx, next) => {
      ctx.log.raw(`name=${ctx.args.name}`)
      await next()
    })

    const { stdout } = await runMiddleware({
      middlewares: [mw],
      overrides: { args: { name: 'Bob' } },
    })
    expect(stdout()).toBe('name=Bob\n')
  })

  it('should short-circuit when middleware does not call next', async () => {
    const blocker = middleware(async () => {
      // Intentionally not calling next
    })

    const second = middleware(async (ctx, next) => {
      ctx.log.raw('should not run')
      await next()
    })

    const { stdout } = await runMiddleware({ middlewares: [blocker, second] })
    expect(stdout()).toBe('')
  })
})
