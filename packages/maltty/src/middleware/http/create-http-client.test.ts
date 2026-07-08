import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHttpClient } from './create-http-client.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createMockResponse(
  data: unknown,
  status = 200
): {
  readonly headers: Headers
  readonly json: () => Promise<unknown>
  readonly ok: boolean
  readonly status: number
} {
  return {
    headers: new Headers(),
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300,
    status,
  }
}

describe('createHttpClient()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create client with all HTTP methods', () => {
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.put).toBe('function')
    expect(typeof client.patch).toBe('function')
    expect(typeof client.delete).toBe('function')
  })

  it('should call fetch with correct URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: true }))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    await client.get('/users')

    const calledUrl = mockFetch.mock.calls[0][0] as string

    expect(calledUrl).toBe('https://api.example.com/users')
  })

  it('should include auth headers when passed via defaultHeaders', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: true }))
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { Authorization: 'Bearer my-token' },
    })

    await client.get('/users')

    const calledInit = mockFetch.mock.calls[0][1] as RequestInit
    const headers = calledInit.headers as Record<string, string>

    expect(headers['Authorization']).toBe('Bearer my-token')
  })

  it('should include default headers in requests', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: true }))
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { 'X-Custom': 'value' },
    })

    await client.get('/users')

    const calledInit = mockFetch.mock.calls[0][1] as RequestInit
    const headers = calledInit.headers as Record<string, string>

    expect(headers['X-Custom']).toBe('value')
  })

  it('should include per-request headers and override defaults', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: true }))
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { 'X-Custom': 'default' },
    })

    await client.get('/users', { headers: { 'X-Custom': 'override' } })

    const calledInit = mockFetch.mock.calls[0][1] as RequestInit
    const headers = calledInit.headers as Record<string, string>

    expect(headers['X-Custom']).toBe('override')
  })

  it('should serialize body as JSON for POST requests', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ id: 1 }))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    await client.post('/users', { body: { name: 'Alice' } })

    const calledInit = mockFetch.mock.calls[0][1] as RequestInit

    expect(calledInit.body).toBe(JSON.stringify({ name: 'Alice' }))

    const headers = calledInit.headers as Record<string, string>

    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should append query params to URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse([]))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    await client.get('/users', { params: { limit: '10', page: '1' } })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    const url = new URL(calledUrl)

    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('limit')).toBe('10')
  })

  it('should return TypedResponse with data, status, ok, headers', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ id: 1, name: 'Alice' }, 200))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    const response = await client.get('/users/1')

    expect(response.data).toEqual({ id: 1, name: 'Alice' })
    expect(response.status).toBe(200)
    expect(response.ok).toBeTruthy()
    expect(response.headers).toBeInstanceOf(Headers)
  })

  it('should return ok false for error status codes', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ error: 'Not found' }, 404))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    const response = await client.get('/users/999')

    expect(response.ok).toBeFalsy()
    expect(response.status).toBe(404)
  })

  it('should use correct HTTP method for each client method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })

    await client.get('/a')
    await client.post('/b')
    await client.put('/c')
    await client.patch('/d')
    await client.delete('/e')

    const methods = mockFetch.mock.calls.map((call: [string, RequestInit]) => call[1].method)

    expect(methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  })
})
