import { hasTag } from '@maltty/utils/tag'
import { describe, expect, it, vi } from 'vitest'

import { createAuthRequire } from './require.js'

function resolveOption<T>(
  options: Record<string, unknown> | undefined,
  key: string,
  fallback: T
): T {
  if (options !== undefined && options[key] !== undefined) {
    return options[key] as T
  }

  return fallback
}

function createMockCtx(options?: { readonly authenticated?: boolean; readonly hasAuth?: boolean }) {
  const hasAuth = resolveOption(options, 'hasAuth', true)
  const authenticated = resolveOption(options, 'authenticated', false)

  const base = {
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
  }

  if (!hasAuth) {
    return base
  }

  return {
    ...base,
    auth: {
      authenticated: () => authenticated,
      credential: () => null,
      login: vi.fn(),
      logout: vi.fn(),
    },
  }
}

describe('createAuthRequire()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = createAuthRequire()

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should call next() when authenticated', async () => {
    const mw = createAuthRequire()
    const ctx = createMockCtx({ authenticated: true, hasAuth: true })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
    expect(ctx.fail).not.toHaveBeenCalled()
  })

  it('should call ctx.fail() with default message when not authenticated', () => {
    const mw = createAuthRequire()
    const ctx = createMockCtx({ authenticated: false, hasAuth: true })
    const next = vi.fn()

    expect(() => mw.handler(ctx as never, next)).toThrow()

    expect(ctx.fail).toHaveBeenCalledWith('Authentication required.', { code: 'AUTH_REQUIRED' })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call ctx.fail() with custom message when provided', () => {
    const mw = createAuthRequire({ message: 'Please log in first.' })
    const ctx = createMockCtx({ authenticated: false, hasAuth: true })
    const next = vi.fn()

    expect(() => mw.handler(ctx as never, next)).toThrow()

    expect(ctx.fail).toHaveBeenCalledWith('Please log in first.', { code: 'AUTH_REQUIRED' })
  })

  it('should call ctx.fail() with AUTH_MIDDLEWARE_MISSING when ctx.auth absent', () => {
    const mw = createAuthRequire()
    const ctx = createMockCtx({ hasAuth: false })
    const next = vi.fn()

    expect(() => mw.handler(ctx as never, next)).toThrow()

    expect(ctx.fail).toHaveBeenCalledWith('auth.require() must run after auth() middleware', {
      code: 'AUTH_MIDDLEWARE_MISSING',
    })
  })
})
