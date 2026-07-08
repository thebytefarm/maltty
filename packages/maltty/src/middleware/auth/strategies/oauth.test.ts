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

import { resolveFromOAuth } from './oauth.js'

const KNOWN_STATE = Buffer.from('a'.repeat(32)).toString('hex')
const KNOWN_VERIFIER = Buffer.from('a'.repeat(32)).toString('base64url')
const KNOWN_CHALLENGE = createHash('sha256').update(KNOWN_VERIFIER).digest('base64url')

/**
 * Captured before any spying so sendCallback always reaches the local server.
 */
const originalFetch = globalThis.fetch

/**
 * Extract the URL string from an execFile mock call.
 *
 * The URL is always the last element of the args array regardless of
 * platform (macOS: `['url']`, Linux: `['url']`, Windows: `['/c', 'start', '', 'url']`).
 */
function extractBrowserUrl(): string {
  const [call] = vi.mocked(execFile).mock.calls
  const [, args] = call
  return args.at(-1)
}

/**
 * Extract the server port from the URL passed to execFile (openBrowser).
 */
function extractPort(): number {
  const url = new URL(extractBrowserUrl())
  const redirectRaw = url.searchParams.get('redirect_uri')

  if (redirectRaw === null) {
    return 0
  }

  const redirectUrl = new URL(redirectRaw)
  return Number(redirectUrl.port)
}

/**
 * Wait for the OAuth server to start and return the assigned port.
 */
async function waitForServer(): Promise<number> {
  await vi.waitFor(() => {
    expect(vi.mocked(execFile)).toHaveBeenCalled()
  })

  return extractPort()
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

/**
 * Extract the authorization URL from the execFile mock call.
 */
function extractAuthUrl(): URL {
  return new URL(extractBrowserUrl())
}

/**
 * Shut down the server by sending a valid callback.
 */
async function shutdownServer(port: number): Promise<void> {
  await sendCallback({
    code: 'cleanup-code',
    path: '/callback',
    port,
    state: KNOWN_STATE,
  }).catch(() => {
    // Server may already be closed
  })
}

describe('resolveFromOAuth()', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should return null when authUrl uses HTTP', async () => {
    const result = await resolveFromOAuth({
      authUrl: 'http://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    expect(result).toBeNull()
  })

  it('should return null when tokenUrl uses HTTP', async () => {
    const result = await resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'http://auth.example.com/token',
    })

    expect(result).toBeNull()
  })

  it('should return null when the timeout fires before a code arrives', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 50,
      tokenUrl: 'https://auth.example.com/token',
    })

    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should return bearer credential when valid code is exchanged', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ access_token: 'at-12345' }, { status: 200 }))

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: ['openid', 'profile'],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    await sendCallback({ code: 'auth-code-123', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise

    expect(result).toEqual({ token: 'at-12345', type: 'bearer' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.com/token',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    )

    const fetchBody = fetchSpy.mock.calls[0][1]?.body as string
    const params = new URLSearchParams(fetchBody)
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('code')).toBe('auth-code-123')
    expect(params.get('client_id')).toBe('test-client')
    expect(params.get('code_verifier')).toBe(KNOWN_VERIFIER)
  })

  it('should return 400 when state does not match', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    const response = await sendCallback({
      code: 'auth-code',
      path: '/callback',
      port,
      state: 'wrong-state',
    })

    expect(response.status).toBe(400)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'cleanup' }, { status: 200 })
    )

    await shutdownServer(port)
    await resultPromise
  })

  it('should return 400 when code is missing from redirect', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    const response = await sendCallback({
      path: '/callback',
      port,
      state: KNOWN_STATE,
    })

    expect(response.status).toBe(400)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'cleanup' }, { status: 200 })
    )

    await shutdownServer(port)
    await resultPromise
  })

  it('should return null when fetch to token endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    await sendCallback({ code: 'auth-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise
    expect(result).toBeNull()
  })

  it('should return null when token endpoint returns error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'invalid_grant' }, { status: 400 })
    )

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    await sendCallback({ code: 'auth-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise
    expect(result).toBeNull()
  })

  it('should return null when response is missing access_token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ token_type: 'bearer' }, { status: 200 })
    )

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    await sendCallback({ code: 'auth-code', path: '/callback', port, state: KNOWN_STATE })

    const result = await resultPromise
    expect(result).toBeNull()
  })

  it('should include scopes in the authorization URL', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: ['openid', 'profile', 'email'],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    await waitForServer()

    const authUrl = extractAuthUrl()
    expect(authUrl.searchParams.get('scope')).toBe('openid profile email')
    expect(authUrl.searchParams.get('response_type')).toBe('code')
    expect(authUrl.searchParams.get('client_id')).toBe('test-client')
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authUrl.searchParams.get('code_challenge')).toBe(KNOWN_CHALLENGE)
    expect(authUrl.searchParams.get('state')).toBe(KNOWN_STATE)

    // Clean up
    const port = extractPort()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'cleanup' }, { status: 200 })
    )
    await shutdownServer(port)
    await resultPromise
  })

  it('should omit scope parameter when scopes array is empty', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    await waitForServer()

    const authUrl = extractAuthUrl()
    expect(authUrl.searchParams.has('scope')).toBeFalsy()

    // Clean up
    const port = extractPort()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'cleanup' }, { status: 200 })
    )
    await shutdownServer(port)
    await resultPromise
  })

  it('should return 200 success page on valid callback', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'at-success' }, { status: 200 })
    )

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    const response = await sendCallback({
      code: 'auth-code',
      path: '/callback',
      port,
      state: KNOWN_STATE,
    })

    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Authentication complete')

    await resultPromise
  })

  it('should return 400 when request path does not match callback path', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()
    const response = await sendCallback({
      code: 'auth-code',
      path: '/wrong-path',
      port,
      state: KNOWN_STATE,
    })

    expect(response.status).toBe(400)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ access_token: 'cleanup' }, { status: 200 })
    )

    await shutdownServer(port)
    await resultPromise
  })

  it('should include redirect_uri in token exchange body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ access_token: 'redirect-uri-token' }, { status: 200 }))

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()

    const authUrl = extractAuthUrl()
    const expectedRedirectUri = authUrl.searchParams.get('redirect_uri')

    await sendCallback({ code: 'auth-code', path: '/callback', port, state: KNOWN_STATE })

    await resultPromise

    const fetchBody = fetchSpy.mock.calls[0][1]?.body as string
    const params = new URLSearchParams(fetchBody)
    expect(params.get('redirect_uri')).toBe(expectedRedirectUri)
  })

  it('should work with custom callbackPath', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ access_token: 'custom-path-token' }, { status: 200 }))

    const resultPromise = resolveFromOAuth({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/oauth/callback',
      clientId: 'test-client',
      port: 0,
      scopes: [],
      timeout: 5000,
      tokenUrl: 'https://auth.example.com/token',
    })

    const port = await waitForServer()

    const authUrl = extractAuthUrl()
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    expect(redirectUri).toContain('/oauth/callback')

    const response = await sendCallback({
      code: 'custom-path-code',
      path: '/oauth/callback',
      port,
      state: KNOWN_STATE,
    })

    expect(response.status).toBe(200)

    const result = await resultPromise
    expect(result).toEqual({ token: 'custom-path-token', type: 'bearer' })

    const fetchBody = fetchSpy.mock.calls[0][1]?.body as string
    const params = new URLSearchParams(fetchBody)
    expect(params.get('redirect_uri')).toContain('/oauth/callback')
  })
})
