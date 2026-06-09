import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createContext } from '@/context/index.js'
import { auth } from '@/middleware/auth/index.js'
import { http } from '@/middleware/http/http.js'
import type { HttpClient } from '@/middleware/http/types.js'

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

/**
 * Create a minimal context for middleware chain testing.
 */
function createTestContext(cliName: string): ReturnType<typeof createContext> {
  return createContext({
    args: {},
    argv: [cliName, 'test'],
    config: {},
    meta: {
      command: ['test'],
      dirs: { global: `.${cliName}`, local: `.${cliName}` },
      name: cliName,
      version: '1.0.0',
    },
  })
}

/**
 * Run middleware handlers in sequence against a shared context.
 */
async function runMiddlewareChain(
  ctx: ReturnType<typeof createContext>,
  ...middlewares: readonly {
    readonly handler: (
      ctx: ReturnType<typeof createContext>,
      next: () => Promise<void>
    ) => Promise<void> | void
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

/**
 * Create a mock Response for fetch.
 */
function createMockResponse(): Response {
  return Response.json({ ok: true }, { status: 200 })
}

describe('Auth + Standalone HTTP Integration', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should decorate ctx.auth with credential() and authenticated() methods', async () => {
    vi.stubEnv('CHAIN_APP_TOKEN', 'chain-test-token')

    const ctx = createTestContext('chain-app')

    const authMiddleware = auth({ strategies: [auth.env()] })

    await runMiddlewareChain(ctx, authMiddleware)

    const authCtx = (
      ctx as unknown as Record<string, { credential: () => unknown; authenticated: () => boolean }>
    ).auth

    expect(authCtx.credential()).toEqual({ token: 'chain-test-token', type: 'bearer' })
    expect(authCtx.authenticated()).toBeTruthy()
  })

  it('should return null credential when env var is not set', async () => {
    const ctx = createTestContext('empty-app')

    const authMiddleware = auth({ strategies: [auth.env()] })

    await runMiddlewareChain(ctx, authMiddleware)

    const authCtx = (
      ctx as unknown as Record<string, { credential: () => unknown; authenticated: () => boolean }>
    ).auth

    expect(authCtx.credential()).toBeNull()
    expect(authCtx.authenticated()).toBeFalsy()
  })
})

describe('Standalone http() (decoupled)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should work standalone with no headers', async () => {
    const ctx = createTestContext('no-auth-middleware')

    const httpMiddleware = http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
    })

    await runMiddlewareChain(ctx, httpMiddleware)

    const client = (ctx as unknown as Record<string, HttpClient>).api
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: {},
      })
    )
  })

  it('should pass static headers to outgoing requests', async () => {
    const ctx = createTestContext('static-headers-app')

    const httpMiddleware = http({
      baseUrl: 'https://api.example.com',
      headers: { 'X-Api-Key': 'abc123' },
      namespace: 'api',
    })

    await runMiddlewareChain(ctx, httpMiddleware)

    const client = (ctx as unknown as Record<string, HttpClient>).api
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Api-Key': 'abc123',
        }),
      })
    )
  })

  it('should resolve headers from a function receiving ctx', async () => {
    const ctx = createTestContext('fn-headers-app')

    const httpMiddleware = http({
      baseUrl: 'https://api.example.com',
      headers: (receivedCtx) => ({
        'X-App-Name': receivedCtx.meta.name,
      }),
      namespace: 'api',
    })

    await runMiddlewareChain(ctx, httpMiddleware)

    const client = (ctx as unknown as Record<string, HttpClient>).api
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-App-Name': 'fn-headers-app',
        }),
      })
    )
  })

  it('should decorate ctx with named namespace from http middleware', async () => {
    const ctx = createTestContext('ns-app')

    const httpMiddleware = http({
      baseUrl: 'https://api.example.com',
      namespace: 'github',
    })

    await runMiddlewareChain(ctx, httpMiddleware)

    const client = (ctx as unknown as Record<string, HttpClient>).github
    expect(client).toBeDefined()
    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.put).toBe('function')
    expect(typeof client.delete).toBe('function')
    expect(typeof client.patch).toBe('function')
  })
})
