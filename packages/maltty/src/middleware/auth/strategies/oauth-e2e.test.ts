import { createHash } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn().mockReturnValue({ on: vi.fn() }),
}))

vi.mock(import('node:crypto'), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(32))),
  }
})

import { execFile } from 'node:child_process'

import { createMockOAuthServer } from '@test/mock-oauth-server.js'
import type { MockOAuthServer } from '@test/mock-oauth-server.js'

import { resolveFromOAuth } from '@/middleware/auth/strategies/oauth.js'

const KNOWN_STATE = Buffer.from('a'.repeat(32)).toString('hex')
const KNOWN_VERIFIER = Buffer.from('a'.repeat(32)).toString('base64url')
const KNOWN_CHALLENGE = createHash('sha256').update(KNOWN_VERIFIER).digest('base64url')

/**
 * Captured before any spying so sendCallback always reaches the local server.
 */
const originalFetch = globalThis.fetch

/**
 * Extract the redirect_uri from the authorization URL passed to execFile.
 */
function extractRedirectUri(): URL {
  const [call] = vi.mocked(execFile).mock.calls
  const authUrl = new URL(call[1][0])
  const redirectRaw = authUrl.searchParams.get('redirect_uri')

  if (redirectRaw === null) {
    return new URL('http://127.0.0.1:0')
  }

  return new URL(redirectRaw)
}

/**
 * Extract the local server port from the redirect_uri.
 */
function extractPort(): number {
  return Number(extractRedirectUri().port)
}

/**
 * Wait for the OAuth callback server to start.
 */
async function waitForServer(): Promise<number> {
  await vi.waitFor(() => {
    expect(vi.mocked(execFile)).toHaveBeenCalled()
  })

  return extractPort()
}

/**
 * Extract the authorization URL from the execFile mock call.
 */
function extractAuthUrl(): URL {
  const [call] = vi.mocked(execFile).mock.calls
  return new URL(call[1][0])
}

/**
 * Send a GET redirect to the local OAuth callback server.
 */
async function sendCallback(options: {
  readonly port: number
  readonly path: string
  readonly code?: string
  readonly state?: string
}): Promise<Response> {
  const url = new URL(`http://127.0.0.1:${String(options.port)}${options.path}`)

  if (options.state !== undefined) {
    url.searchParams.set('state', options.state)
  }

  if (options.code !== undefined) {
    url.searchParams.set('code', options.code)
  }

  return originalFetch(url.toString())
}

describe('OAuth PKCE E2E (resolveFromOAuth with real mock server)', () => {
  let mockServer: MockOAuthServer | null = null

  afterEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()

    if (mockServer !== null) {
      mockServer.close()
      mockServer = null
    }
  })

  it('should complete full PKCE flow and return bearer credential', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'e2e-access-token',
      clientId: 'pkce-client',
      validCode: 'valid-auth-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()
    await sendCallback({ code: 'valid-auth-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise

    expect(result).toEqual({ token: 'e2e-access-token', type: 'bearer' })

    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests).toHaveLength(1)
    expect(tokenRequests[0].params.get('grant_type')).toBe('authorization_code')
    expect(tokenRequests[0].params.get('code')).toBe('valid-auth-code')
    expect(tokenRequests[0].params.get('client_id')).toBe('pkce-client')
    expect(tokenRequests[0].params.get('code_verifier')).toBe(KNOWN_VERIFIER)
  })

  it('should validate PKCE code_challenge against code_verifier', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'verified-token',
      clientId: 'pkce-client',
      validCode: 'challenge-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()

    const authUrl = extractAuthUrl()
    expect(authUrl.searchParams.get('code_challenge')).toBe(KNOWN_CHALLENGE)
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')

    await sendCallback({ code: 'challenge-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise

    expect(result).toEqual({ token: 'verified-token', type: 'bearer' })

    const tokenRequests = mockServer.getTokenRequests()
    const sentVerifier = tokenRequests[0].params.get('code_verifier')

    expect(sentVerifier).toBe(KNOWN_VERIFIER)

    if (sentVerifier === null) {
      expect.fail('code_verifier should be present in token request')
    }

    const derivedChallenge = createHash('sha256').update(sentVerifier).digest('base64url')
    expect(derivedChallenge).toBe(KNOWN_CHALLENGE)
  })

  it('should return null when mock server rejects the authorization code', async () => {
    mockServer = await createMockOAuthServer({
      clientId: 'pkce-client',
      validCode: 'correct-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()
    await sendCallback({ code: 'wrong-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should include all required parameters in authorization URL', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'url-check-token',
      clientId: 'pkce-client',
      validCode: 'url-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    await waitForServer()

    const authUrl = extractAuthUrl()
    expect(authUrl.searchParams.get('response_type')).toBe('code')
    expect(authUrl.searchParams.get('client_id')).toBe('pkce-client')
    expect(authUrl.searchParams.get('redirect_uri')).toContain('127.0.0.1')
    expect(authUrl.searchParams.get('code_challenge')).toBe(KNOWN_CHALLENGE)
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authUrl.searchParams.get('state')).toBe(KNOWN_STATE)

    // Clean up
    const port = extractPort()
    await sendCallback({ code: 'url-code', path: '/callback', port, state: KNOWN_STATE })
    await resultPromise
  })

  it('should include scopes in authorization URL when configured', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'scoped-token',
      clientId: 'pkce-client',
      validCode: 'scoped-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: ['openid', 'profile'],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    await waitForServer()

    const authUrl = extractAuthUrl()
    expect(authUrl.searchParams.get('scope')).toBe('openid profile')

    // Clean up
    const port = extractPort()
    await sendCallback({ code: 'scoped-code', path: '/callback', port, state: KNOWN_STATE })
    await resultPromise
  })

  it('should pass correct grant_type and parameters to token endpoint', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'params-token',
      clientId: 'pkce-client',
      validCode: 'params-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()
    await sendCallback({ code: 'params-code', path: '/callback', port, state: KNOWN_STATE })

    await resultPromise

    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests).toHaveLength(1)

    const [{ params }] = tokenRequests
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('code')).toBe('params-code')
    expect(params.get('client_id')).toBe('pkce-client')
    expect(params.get('code_verifier')).toBe(KNOWN_VERIFIER)
    expect(params.get('redirect_uri')).toContain('127.0.0.1')
  })

  it('should return null when server rejects due to verifier mismatch', async () => {
    mockServer = await createMockOAuthServer({
      clientId: 'pkce-client',
      rejectVerifier: true,
      validCode: 'verifier-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()
    await sendCallback({ code: 'verifier-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should return null on timeout when no callback arrives', async () => {
    mockServer = await createMockOAuthServer({
      clientId: 'pkce-client',
      validCode: 'timeout-code',
    })

    const result = await resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 50,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()
    expect(mockServer.getTokenRequests()).toHaveLength(0)
  })

  it('should destroy local server after timeout', async () => {
    mockServer = await createMockOAuthServer({
      clientId: 'pkce-client',
      validCode: 'timeout-shutdown-code',
    })

    const result = await resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 50,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()

    const port = extractPort()

    // After timeout, the server should be destroyed
    await expect(originalFetch(`http://127.0.0.1:${String(port)}/callback`)).rejects.toThrow()
  })

  it('should handle redirect_uri with dynamic port correctly', async () => {
    mockServer = await createMockOAuthServer({
      accessToken: 'port-token',
      clientId: 'pkce-client',
      validCode: 'port-code',
    })

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'pkce-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const port = await waitForServer()

    const redirectUri = extractRedirectUri()
    expect(redirectUri.hostname).toBe('127.0.0.1')
    expect(Number(redirectUri.port)).toBeGreaterThan(0)
    expect(redirectUri.pathname).toBe('/callback')

    await sendCallback({ code: 'port-code', path: '/callback', port, state: KNOWN_STATE })

    await resultPromise

    // Verify the same redirect_uri was sent to the token endpoint
    const tokenRequests = mockServer.getTokenRequests()
    const tokenRedirectUri = tokenRequests[0].params.get('redirect_uri')
    expect(tokenRedirectUri).toBe(redirectUri.toString())
  })
})
