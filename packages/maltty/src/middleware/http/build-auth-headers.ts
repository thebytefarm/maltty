import { Buffer } from 'node:buffer'

import { match } from 'ts-pattern'

import type { AuthCredential } from '../auth/types.js'

/**
 * Convert an auth credential into HTTP headers.
 *
 * @param credential - The credential to convert.
 * @returns A record of header name to header value.
 */
export function buildAuthHeaders(credential: AuthCredential): Readonly<Record<string, string>> {
  return match(credential)
    .with({ type: 'bearer' }, (c) => ({
      Authorization: `Bearer ${c.token}`,
    }))
    .with({ type: 'basic' }, (c) => ({
      Authorization: `Basic ${Buffer.from(`${c.username}:${c.password}`).toString('base64')}`,
    }))
    .with({ type: 'api-key' }, (c) => ({
      [c.headerName]: c.key,
    }))
    .with({ type: 'custom' }, (c) => ({ ...c.headers }))
    .exhaustive()
}
