import { describe, expect, it } from 'vitest'

import type { CommandContext } from '@/context/types.js'

import { createAuthHeaders } from './headers.js'

function createMockCtx(options?: {
  readonly credential?: { readonly type: string; readonly [key: string]: unknown } | null
}): CommandContext {
  if (options === undefined) {
    return {} as CommandContext
  }

  const { credential } = options

  if (credential === undefined) {
    return {} as CommandContext
  }

  return {
    auth: {
      authenticated: () => credential !== null,
      credential: () => credential,
      login: async () => [null, credential] as const,
      logout: async () => [null, ''] as const,
    },
  } as unknown as CommandContext
}

describe('createAuthHeaders()', () => {
  it('should return a function', () => {
    const resolveHeaders = createAuthHeaders()

    expect(typeof resolveHeaders).toBe('function')
  })

  it('should return bearer header when credential exists', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = createMockCtx({
      credential: { token: 'my-token', type: 'bearer' },
    })

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({ Authorization: 'Bearer my-token' })
  })

  it('should return empty record when no credential', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = createMockCtx({ credential: null })

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({})
  })

  it('should return empty record when ctx has no auth', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = {} as CommandContext

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({})
  })

  it('should handle basic credential type', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = createMockCtx({
      credential: { password: 'pass', type: 'basic', username: 'user' },
    })

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({
      Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`,
    })
  })

  it('should handle api-key credential type', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = createMockCtx({
      credential: { headerName: 'X-Api-Key', key: 'my-key', type: 'api-key' },
    })

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({ 'X-Api-Key': 'my-key' })
  })

  it('should handle custom credential type', () => {
    const resolveHeaders = createAuthHeaders()
    const ctx = createMockCtx({
      credential: {
        headers: { 'X-Custom': 'value' },
        type: 'custom',
      },
    })

    const headers = resolveHeaders(ctx)

    expect(headers).toEqual({ 'X-Custom': 'value' })
  })
})
