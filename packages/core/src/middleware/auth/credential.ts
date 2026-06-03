import { attemptAsync } from '@maltty/utils/fp'

import { TOKEN_VAR_SUFFIX } from './constants.js'
import type { BearerCredential } from './types.js'

/**
 * Check whether a token string is a non-empty, non-whitespace value.
 *
 * Acts as a type guard: when it returns true, TypeScript narrows the
 * token to `string`. Consolidates the repeated `!token || token.trim() === ''`
 * guard found across strategy resolvers.
 *
 * @param token - The token string to check.
 * @returns True when the token is a non-empty string.
 */
export function isValidToken(token: string | undefined | null): token is string {
  if (!token) {
    return false
  }

  if (token.trim() === '') {
    return false
  }

  return true
}

/**
 * Construct a bearer credential from a raw token string.
 *
 * @param token - The access token value.
 * @returns A BearerCredential with `type: 'bearer'`.
 */
export function createBearerCredential(token: string): BearerCredential {
  return { token, type: 'bearer' } satisfies BearerCredential
}

/**
 * Derive the default environment variable name from a CLI name.
 *
 * Converts kebab-case to SCREAMING_SNAKE_CASE and appends `_TOKEN`.
 * Example: `my-app` → `MY_APP_TOKEN`
 *
 * @param cliName - The CLI name.
 * @returns The derived environment variable name.
 */
export function deriveTokenVar(cliName: string): string {
  return `${cliName.replaceAll('-', '_').toUpperCase()}${TOKEN_VAR_SUFFIX}`
}

/**
 * POST form-encoded parameters to a URL.
 *
 * Wraps the duplicated `fetch` call with `Content-Type: application/x-www-form-urlencoded`
 * found in the OAuth and device code strategies. Returns null on network or
 * request failure instead of throwing.
 *
 * @param url - The endpoint URL.
 * @param params - The URL-encoded form parameters.
 * @param signal - Optional AbortSignal for timeout/cancellation.
 * @returns The fetch Response on success, null on failure.
 */
export async function postFormEncoded(
  url: string,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<Response | null> {
  const [fetchError, response] = await attemptAsync(() =>
    fetch(url, {
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      signal,
    })
  )

  if (fetchError) {
    return null
  }

  return response
}
