import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { attemptAsync, isPlainObject } from '@maltty/utils/fp'

import { createBearerCredential, postFormEncoded } from '../credential.js'
import {
  createDeferred,
  createTimeout,
  destroyServer,
  isSecureAuthUrl,
  openBrowser,
  sendSuccessPage,
  startLocalServer,
} from '../oauth-server.js'
import type { AuthCredential } from '../types.js'

/**
 * Resolve a bearer credential via OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252).
 *
 * 1. Generates a `code_verifier` and derives the `code_challenge`
 * 2. Starts a local HTTP server on `127.0.0.1`
 * 3. Opens the browser to the authorization URL with PKCE params
 * 4. Receives the authorization code via GET redirect
 * 5. Exchanges the code at the token endpoint with the verifier
 * 6. Returns the access token as a bearer credential
 *
 * @param options - PKCE flow configuration.
 * @returns A bearer credential on success, null on failure or timeout.
 */
export async function resolveFromOAuth(options: {
  readonly clientId: string
  readonly authUrl: string
  readonly tokenUrl: string
  readonly scopes: readonly string[]
  readonly port: number
  readonly callbackPath: string
  readonly timeout: number
}): Promise<AuthCredential | null> {
  if (!isSecureAuthUrl(options.authUrl)) {
    return null
  }

  if (!isSecureAuthUrl(options.tokenUrl)) {
    return null
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = deriveCodeChallenge(codeVerifier)
  const state = randomBytes(32).toString('hex')

  const timeout = createTimeout(options.timeout)
  const codeDeferred = createDeferred<string | null>()

  const handle = startLocalServer({
    onRequest: (req, res) => {
      handleCallback(req, res, options.callbackPath, state, codeDeferred.resolve)
    },
    port: options.port,
  })

  const serverPort = await handle.port

  if (serverPort === null) {
    timeout.clear()
    return null
  }

  const redirectUri = `http://127.0.0.1:${String(serverPort)}${options.callbackPath}`

  const fullAuthUrl = buildAuthUrl({
    authUrl: options.authUrl,
    clientId: options.clientId,
    codeChallenge,
    redirectUri,
    scopes: options.scopes,
    state,
  })

  openBrowser(fullAuthUrl)

  const timeoutPromise = timeout.promise.then((): null => {
    codeDeferred.resolve(null)
    destroyServer(handle.server, handle.sockets)
    return null
  })

  const code = await Promise.race([codeDeferred.promise, timeoutPromise])

  timeout.clear()

  if (!code) {
    destroyServer(handle.server, handle.sockets)
    return null
  }

  destroyServer(handle.server, handle.sockets)

  const token = await exchangeCodeForToken({
    clientId: options.clientId,
    code,
    codeVerifier,
    redirectUri,
    tokenUrl: options.tokenUrl,
  })

  return token
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random code verifier for PKCE.
 *
 * @private
 * @returns A base64url-encoded random string.
 */
function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Derive a S256 code challenge from a code verifier.
 *
 * @private
 * @param verifier - The code verifier string.
 * @returns The base64url-encoded SHA-256 hash.
 */
function deriveCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

/**
 * Build the full authorization URL with PKCE query parameters.
 *
 * @private
 * @param options - Authorization URL components.
 * @returns The complete authorization URL string.
 */
function buildAuthUrl(options: {
  readonly authUrl: string
  readonly clientId: string
  readonly redirectUri: string
  readonly codeChallenge: string
  readonly state: string
  readonly scopes: readonly string[]
}): string {
  const url = new URL(options.authUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', options.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('code_challenge', options.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', options.state)

  if (options.scopes.length > 0) {
    url.searchParams.set('scope', options.scopes.join(' '))
  }

  return url.toString()
}

/**
 * Handle an incoming HTTP request on the callback server.
 *
 * Accepts GET requests to the callback path with `code` and `state`
 * query parameters. Validates the state nonce and resolves the
 * authorization code.
 *
 * @private
 * @param req - The incoming HTTP request.
 * @param res - The server response.
 * @param callbackPath - The expected callback path.
 * @param expectedState - The state nonce to validate.
 * @param resolve - Callback to deliver the authorization code.
 */
function handleCallback(
  req: IncomingMessage,
  res: ServerResponse,
  callbackPath: string,
  expectedState: string,
  resolve: (value: string | null) => void
): void {
  const result = extractCodeFromUrl(req.url, callbackPath, expectedState)

  if (!result.ok) {
    res.writeHead(400)
    res.end()

    if (result.isOAuthError) {
      resolve(null)
    }

    return
  }

  sendSuccessPage(res)
  resolve(result.code)
}

/**
 * Result of extracting an authorization code from a callback URL.
 *
 * @private
 */
type ExtractCodeResult =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly isOAuthError: boolean }

/**
 * Extract an authorization code from a request URL.
 *
 * Validates that the request path matches the callback path,
 * the `state` parameter matches the expected nonce, and a
 * `code` parameter is present. Detects OAuth error responses
 * (e.g. `?error=access_denied`) and flags them so the caller
 * can resolve immediately instead of waiting for the timeout.
 *
 * @private
 * @param reqUrl - The raw request URL string.
 * @param callbackPath - The expected callback path.
 * @param expectedState - The state nonce to validate.
 * @returns An extraction result with the code or error flag.
 */
function extractCodeFromUrl(
  reqUrl: string | undefined,
  callbackPath: string,
  expectedState: string
): ExtractCodeResult {
  const url = new URL(reqUrl ?? '/', 'http://localhost')

  if (url.pathname !== callbackPath) {
    return { isOAuthError: false, ok: false }
  }

  const state = url.searchParams.get('state')

  if (state !== expectedState) {
    return { isOAuthError: false, ok: false }
  }

  const error = url.searchParams.get('error')

  if (error) {
    return { isOAuthError: true, ok: false }
  }

  const code = url.searchParams.get('code')

  if (!code) {
    return { isOAuthError: false, ok: false }
  }

  return { code, ok: true }
}

/**
 * Exchange an authorization code for an access token at the token endpoint.
 *
 * Sends a POST request with `application/x-www-form-urlencoded` body
 * containing the authorization code, redirect URI, client ID, and
 * PKCE code verifier.
 *
 * @private
 * @param options - Token exchange parameters.
 * @returns A bearer credential on success, null on failure.
 */
async function exchangeCodeForToken(options: {
  readonly tokenUrl: string
  readonly code: string
  readonly redirectUri: string
  readonly clientId: string
  readonly codeVerifier: string
}): Promise<AuthCredential | null> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    code: options.code,
    code_verifier: options.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: options.redirectUri,
  })

  const response = await postFormEncoded(options.tokenUrl, body)

  if (!response) {
    return null
  }

  if (!response.ok) {
    return null
  }

  const [parseError, data] = await attemptAsync((): Promise<unknown> => response.json())

  if (parseError) {
    return null
  }

  if (!isPlainObject(data)) {
    return null
  }

  if (typeof data.access_token !== 'string' || data.access_token === '') {
    return null
  }

  if (typeof data.token_type === 'string' && data.token_type.toLowerCase() !== 'bearer') {
    return null
  }

  return createBearerCredential(data.access_token)
}
