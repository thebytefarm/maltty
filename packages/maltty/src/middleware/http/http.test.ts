import { hasTag } from '@maltty/utils/tag'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { http } from './http.js'

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
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

function createMockResponse(): Response {
  return Response.json({ ok: true }, { status: 200 })
}

describe('http()', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a Middleware tagged object', () => {
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate context with client at namespace', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api'] as Record<string, unknown>

    expect(client).toBeDefined()
    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.put).toBe('function')
    expect(typeof client.patch).toBe('function')
    expect(typeof client.delete).toBe('function')
  })

  it('should work without headers (public API)', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api']

    expect(client).toBeDefined()
    expect(next).toHaveBeenCalled()
  })

  it('should pass static headers to the client', async () => {
    const ctx = createMockCtx()
    const mw = http({
      baseUrl: 'https://api.example.com',
      headers: { 'X-Api-Key': 'abc123' },
      namespace: 'api',
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api'] as {
      get: (path: string) => Promise<unknown>
    }
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Api-Key': 'abc123' }),
      })
    )
    expect(next).toHaveBeenCalled()
  })

  it('should resolve headers from a function', async () => {
    const ctx = createMockCtx()
    const headersFn = vi.fn(() => ({ 'X-Custom': 'dynamic-value' }))
    const mw = http({
      baseUrl: 'https://api.example.com',
      headers: headersFn,
      namespace: 'api',
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(headersFn).toHaveBeenCalledWith(ctx)

    const client = (ctx as Record<string, unknown>)['api'] as {
      get: (path: string) => Promise<unknown>
    }
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Custom': 'dynamic-value' }),
      })
    )
    expect(next).toHaveBeenCalled()
  })

  it('should resolve headers from an async function', async () => {
    const ctx = createMockCtx()
    const asyncHeadersFn = vi.fn(() => Promise.resolve({ 'X-Async': 'async-value' }))
    const mw = http({
      baseUrl: 'https://api.example.com',
      headers: asyncHeadersFn,
      namespace: 'api',
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(asyncHeadersFn).toHaveBeenCalledWith(ctx)

    const client = (ctx as Record<string, unknown>)['api'] as {
      get: (path: string) => Promise<unknown>
    }
    await client.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Async': 'async-value' }),
      })
    )
    expect(next).toHaveBeenCalled()
  })

  it('should call next after decorating context', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
