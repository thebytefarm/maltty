import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import { decorateContext } from '@/context/decorate.js'
import { createContext } from '@/context/index.js'
import type { CommandContext } from '@/context/types.js'
import { middleware } from '@/middleware.js'

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
  spinner: vi.fn(() => ({
    message: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  text: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Test types
// ---------------------------------------------------------------------------

interface User {
  readonly id: string
  readonly role: 'admin' | 'user'
}

interface Organization {
  readonly id: string
  readonly name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal test context.
 * @private
 */
function createTestContext(): CommandContext {
  return createContext({
    args: {},
    argv: ['test-app', 'test'],
    config: {},
    meta: {
      command: ['test'],
      dirs: { global: '.test-app', local: '.test-app' },
      name: 'test-app',
      version: '1.0.0',
    },
  })
}

/**
 * Run a middleware handler chain against a shared context.
 * @private
 */
async function runMiddlewareChain(
  ctx: CommandContext,
  ...middlewares: readonly {
    readonly handler: (ctx: CommandContext, next: () => Promise<void>) => Promise<void> | void
  }[]
): Promise<void> {
  const run = (index: number): Promise<void> => {
    if (index >= middlewares.length) {
      return Promise.resolve()
    }

    return Promise.resolve(middlewares[index]!.handler(ctx, () => run(index + 1)))
  }

  await run(0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('typed middleware', () => {
  describe('single typed middleware', () => {
    it('should make decorated variable visible on ctx in handler', async () => {
      const testUser: User = { id: 'u-1', role: 'admin' }

      const loadUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
        decorateContext(ctx, 'user', testUser)
        await next()
      })

      const handler = vi.fn()

      command({
        handler,
        middleware: [loadUser],
      })

      const ctx = createTestContext()
      await runMiddlewareChain(ctx, loadUser)
      handler(ctx)

      const receivedCtx = handler.mock.calls[0]![0] as CommandContext & Readonly<{ user: User }>
      expect(receivedCtx.user).toEqual(testUser)
      expect(receivedCtx.user.role).toBe('admin')
    })
  })

  describe('multiple typed middleware', () => {
    it('should merge variables from all middleware onto ctx', async () => {
      const testUser: User = { id: 'u-1', role: 'user' }
      const testOrg: Organization = { id: 'org-1', name: 'Acme' }

      const loadUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
        decorateContext(ctx, 'user', testUser)
        await next()
      })

      const loadOrg = middleware<{ Variables: { org: Organization } }>(async (ctx, next) => {
        decorateContext(ctx, 'org', testOrg)
        await next()
      })

      const handler = vi.fn()

      command({
        handler,
        middleware: [loadUser, loadOrg],
      })

      const ctx = createTestContext()
      await runMiddlewareChain(ctx, loadUser, loadOrg)
      handler(ctx)

      const receivedCtx = handler.mock.calls[0]![0] as CommandContext &
        Readonly<{ user: User; org: Organization }>
      expect(receivedCtx.user).toEqual(testUser)
      expect(receivedCtx.org).toEqual(testOrg)
    })
  })

  describe('untyped middleware', () => {
    it('should contribute no extra variables to ctx', async () => {
      const timing = middleware(async (_ctx, next) => {
        await next()
      })

      const handler = vi.fn()

      command({
        handler,
        middleware: [timing],
      })

      const ctx = createTestContext()
      await runMiddlewareChain(ctx, timing)
      handler(ctx)

      expect(handler).toHaveBeenCalledTimes(1)
      const receivedCtx = handler.mock.calls[0]![0] as CommandContext
      expect(receivedCtx.args).toBeDefined()
      expect(receivedCtx.meta).toBeDefined()
    })
  })

  describe('middleware ordering', () => {
    it('should allow later middleware to read properties set by earlier middleware', async () => {
      const testUser: User = { id: 'u-2', role: 'admin' }
      const readValues: unknown[] = []

      const loadUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
        decorateContext(ctx, 'user', testUser)
        await next()
      })

      const readUser = middleware(async (ctx, next) => {
        const ctxWithUser = ctx as CommandContext & Readonly<{ user: User }>
        readValues.push(ctxWithUser.user)
        await next()
      })

      const ctx = createTestContext()
      await runMiddlewareChain(ctx, loadUser, readUser)

      expect(readValues).toEqual([testUser])
    })
  })
})
