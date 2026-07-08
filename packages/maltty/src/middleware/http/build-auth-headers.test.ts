import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { buildAuthHeaders } from './build-auth-headers.js'

describe('buildAuthHeaders()', () => {
  it('should return Authorization Bearer header for bearer credential', () => {
    const headers = buildAuthHeaders({ token: 'abc123', type: 'bearer' })

    expect(headers).toEqual({ Authorization: 'Bearer abc123' })
  })

  it('should return Authorization Basic header for basic credential', () => {
    const headers = buildAuthHeaders({
      password: 'pass',
      type: 'basic',
      username: 'user',
    })

    const expected = Buffer.from('user:pass').toString('base64')

    expect(headers).toEqual({ Authorization: `Basic ${expected}` })
  })

  it('should return custom header name for api-key credential', () => {
    const headers = buildAuthHeaders({
      headerName: 'X-Api-Key',
      key: 'my-api-key',
      type: 'api-key',
    })

    expect(headers).toEqual({ 'X-Api-Key': 'my-api-key' })
  })

  it('should return all headers from custom credential', () => {
    const headers = buildAuthHeaders({
      headers: {
        'X-Custom-Auth': 'custom-value',
        'X-Org-Id': 'org-123',
      },
      type: 'custom',
    })

    expect(headers).toEqual({
      'X-Custom-Auth': 'custom-value',
      'X-Org-Id': 'org-123',
    })
  })

  it('should encode special characters in basic credential', () => {
    const headers = buildAuthHeaders({
      password: 'p@ss:w0rd',
      type: 'basic',
      username: 'us3r',
    })

    const expected = Buffer.from('us3r:p@ss:w0rd').toString('base64')

    expect(headers).toEqual({ Authorization: `Basic ${expected}` })
  })
})
