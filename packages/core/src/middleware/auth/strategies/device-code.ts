import { attemptAsync, isPlainObject, match } from '@maltty/utils/fp'

import type { Prompts } from '@/context/types.js'

import { createBearerCredential, postFormEncoded } from '../credential.js'
import { isSecureAuthUrl, openBrowser } from '../oauth-server.js'
import type { AuthCredential } from '../types.js'

/**
 * RFC 8628 slow_down backoff increment in milliseconds.
 */
const SLOW_DOWN_INCREMENT = 5000

/**
 * RFC 8628 device code grant type URN.
 */
const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

/**
 * Resolve a bearer credential via OAuth 2.0 Device Authorization Grant (RFC 8628).
 *
 * 1. POSTs to the device authorization endpoint to obtain a device code
 * 2. Displays the verification URL and user code via prompts
 * 3. Optionally opens the verification URL in the browser
 * 4. Polls the token endpoint until authorization completes or times out
 *
 * @param options - Device code flow configuration.
 * @returns A bearer credential on success, null on failure or timeout.
 */
export async function resolveFromDeviceCode(options: {
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes: readonly string[]
  readonly pollInterval: number
  readonly timeout: number
  readonly prompts: Prompts
  readonly openBrowserOnStart?: boolean
}): Promise<AuthCredential | null> {
  if (!isSecureAuthUrl(options.deviceAuthUrl)) {
    return null
  }

  if (!isSecureAuthUrl(options.tokenUrl)) {
    return null
  }

  const deadline = Date.now() + options.timeout
  const signal = AbortSignal.timeout(options.timeout)

  const authResponse = await requestDeviceAuth({
    clientId: options.clientId,
    deviceAuthUrl: options.deviceAuthUrl,
    scopes: options.scopes,
    signal,
  })

  if (!authResponse) {
    return null
  }

  await displayUserCode(options.prompts, authResponse.verificationUri, authResponse.userCode)

  if (options.openBrowserOnStart !== false) {
    openBrowser(authResponse.verificationUri)
  }

  const interval = resolveInterval(authResponse.interval, options.pollInterval)

  return pollForToken({
    clientId: options.clientId,
    deadline,
    deviceCode: authResponse.deviceCode,
    interval,
    signal,
    tokenUrl: options.tokenUrl,
  })
}

// ---------------------------------------------------------------------------
// Private types
// ---------------------------------------------------------------------------

/**
 * Parsed response from the device authorization endpoint.
 *
 * @private
 */
interface DeviceAuthResponse {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly interval: number | null
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Request a device code from the authorization server.
 *
 * @private
 * @param options - Device auth request parameters.
 * @returns The parsed device auth response, or null on failure.
 */
async function requestDeviceAuth(options: {
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly scopes: readonly string[]
  readonly signal?: AbortSignal
}): Promise<DeviceAuthResponse | null> {
  const body = new URLSearchParams({ client_id: options.clientId })

  if (options.scopes.length > 0) {
    body.set('scope', options.scopes.join(' '))
  }

  const response = await postFormEncoded(options.deviceAuthUrl, body, options.signal)

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

  return parseDeviceAuthResponse(data)
}

/**
 * Parse a device authorization response body.
 *
 * @private
 * @param data - The raw response data.
 * @returns The parsed response, or null if required fields are missing.
 */
function parseDeviceAuthResponse(data: unknown): DeviceAuthResponse | null {
  if (!isPlainObject(data)) {
    return null
  }

  if (typeof data.device_code !== 'string' || data.device_code === '') {
    return null
  }

  if (typeof data.user_code !== 'string' || data.user_code === '') {
    return null
  }

  if (typeof data.verification_uri !== 'string' || data.verification_uri === '') {
    return null
  }

  const interval = resolveServerInterval(data.interval)

  return {
    deviceCode: data.device_code,
    interval,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
  }
}

/**
 * Display the verification URL and user code to the user.
 *
 * Uses `prompts.text()` to show the information and wait for
 * the user to press Enter to acknowledge.
 *
 * @private
 * @param prompts - The prompts instance.
 * @param verificationUri - The URL the user should visit.
 * @param userCode - The code the user should enter.
 */
async function displayUserCode(
  prompts: Prompts,
  verificationUri: string,
  userCode: string
): Promise<void> {
  // User cancellation is non-fatal — polling will handle timeout
  await attemptAsync(() =>
    prompts.text({
      defaultValue: '',
      message: `Open ${verificationUri} and enter code: ${userCode} (press Enter to continue)`,
    })
  )
}

/**
 * Resolve the poll interval, preferring server-provided value.
 *
 * @private
 * @param serverInterval - The interval from the server response (in ms), or null.
 * @param configInterval - The configured default interval.
 * @returns The resolved interval in milliseconds.
 */
function resolveInterval(serverInterval: number | null, configInterval: number): number {
  if (serverInterval !== null) {
    return serverInterval
  }

  return configInterval
}

/**
 * Poll the token endpoint for an access token using recursive tail-call style.
 *
 * Handles RFC 8628 error codes:
 * - `authorization_pending` -- continue polling
 * - `slow_down` -- increase interval by 5 seconds, continue
 * - `expired_token` -- return null
 * - `access_denied` -- return null
 *
 * @private
 * @param options - Polling parameters.
 * @returns A bearer credential on success, null on failure or timeout.
 */
async function pollForToken(options: {
  readonly tokenUrl: string
  readonly deviceCode: string
  readonly clientId: string
  readonly interval: number
  readonly deadline: number
  readonly signal?: AbortSignal
}): Promise<AuthCredential | null> {
  if (Date.now() >= options.deadline) {
    return null
  }

  await sleep(options.interval)

  if (Date.now() >= options.deadline) {
    return null
  }

  const result = await requestToken({
    clientId: options.clientId,
    deviceCode: options.deviceCode,
    signal: options.signal,
    tokenUrl: options.tokenUrl,
  })

  return match(result)
    .with({ status: 'success' }, (r) => r.credential)
    .with({ status: 'pending' }, () => pollForToken(options))
    .with({ status: 'slow_down' }, () =>
      pollForToken({
        ...options,
        interval: options.interval + SLOW_DOWN_INCREMENT,
      })
    )
    .with({ status: 'denied' }, () => null)
    .with({ status: 'expired' }, () => null)
    .with({ status: 'error' }, () => null)
    .exhaustive()
}

/**
 * Convert a server-provided interval value to milliseconds.
 *
 * @private
 * @param value - The raw interval value from the server response.
 * @returns The interval in milliseconds, or null if not a number.
 */
function resolveServerInterval(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.max(1000, Math.min(value * 1000, 60_000))
}

/**
 * Sleep for a given duration.
 *
 * @private
 * @param ms - Duration in milliseconds.
 * @returns A promise that resolves after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// ---------------------------------------------------------------------------
// Token request types and helpers
// ---------------------------------------------------------------------------

/**
 * Discriminated union of token request outcomes.
 *
 * @private
 */
type TokenRequestResult =
  | { readonly status: 'success'; readonly credential: AuthCredential }
  | { readonly status: 'pending' }
  | { readonly status: 'slow_down' }
  | { readonly status: 'denied' }
  | { readonly status: 'expired' }
  | { readonly status: 'error' }

/**
 * Request an access token from the token endpoint.
 *
 * @private
 * @param options - Token request parameters.
 * @returns A discriminated result indicating the outcome.
 */
async function requestToken(options: {
  readonly tokenUrl: string
  readonly deviceCode: string
  readonly clientId: string
  readonly signal?: AbortSignal
}): Promise<TokenRequestResult> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    device_code: options.deviceCode,
    grant_type: DEVICE_CODE_GRANT_TYPE,
  })

  const response = await postFormEncoded(options.tokenUrl, body, options.signal)

  if (!response) {
    return { status: 'error' }
  }

  const [parseError, data] = await attemptAsync((): Promise<unknown> => response.json())

  if (parseError) {
    return { status: 'error' }
  }

  if (!isPlainObject(data)) {
    return { status: 'error' }
  }

  if (response.ok && typeof data.access_token === 'string' && data.access_token !== '') {
    if (typeof data.token_type === 'string' && data.token_type.toLowerCase() !== 'bearer') {
      return { status: 'error' }
    }

    return { credential: createBearerCredential(data.access_token), status: 'success' }
  }

  if (typeof data.error !== 'string') {
    return { status: 'error' }
  }

  return match(data.error)
    .with('authorization_pending', (): TokenRequestResult => ({ status: 'pending' }))
    .with('slow_down', (): TokenRequestResult => ({ status: 'slow_down' }))
    .with('expired_token', (): TokenRequestResult => ({ status: 'expired' }))
    .with('access_denied', (): TokenRequestResult => ({ status: 'denied' }))
    .otherwise((): TokenRequestResult => ({ status: 'error' }))
}
