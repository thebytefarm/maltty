import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DevicePollResponse =
  | { readonly type: 'pending' }
  | { readonly type: 'slow_down' }
  | { readonly type: 'denied' }
  | { readonly type: 'expired' }
  | { readonly type: 'success'; readonly accessToken: string }

export interface MockOAuthServerOptions {
  readonly clientId: string
  readonly validCode?: string
  readonly accessToken?: string
  readonly expectedVerifier?: string
  readonly deviceCode?: string
  readonly userCode?: string
  readonly verificationUri?: string
  readonly devicePollResponses?: readonly DevicePollResponse[]
  readonly deviceInterval?: number
  readonly rejectVerifier?: boolean
}

export interface TokenRequest {
  readonly params: URLSearchParams
  readonly headers: Record<string, string | undefined>
  readonly timestamp: number
}

export interface DeviceAuthRequest {
  readonly params: URLSearchParams
  readonly headers: Record<string, string | undefined>
}

export interface MockOAuthServer {
  readonly url: string
  readonly port: number
  readonly close: () => void
  readonly getTokenRequests: () => readonly TokenRequest[]
  readonly getDeviceAuthRequests: () => readonly DeviceAuthRequest[]
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function createMockOAuthServer(
  options: MockOAuthServerOptions
): Promise<MockOAuthServer> {
  const tokenRequests: TokenRequest[] = []
  const deviceAuthRequests: DeviceAuthRequest[] = []
  const sockets = new Set<Socket>()

  const state: { pollIndex: number } = { pollIndex: 0 }

  const server = createServer((req, res) => {
    collectBody(req, (body) => {
      routeRequest(req, res, body, options, tokenRequests, deviceAuthRequests, state)
    })
  })

  trackConnections(server, sockets)

  const port = await listenOnEphemeral(server)

  return {
    close: () => {
      server.close()
      Array.from(sockets, (s) => s.destroy())
      sockets.clear()
    },
    getDeviceAuthRequests: () => [...deviceAuthRequests],
    getTokenRequests: () => [...tokenRequests],
    port,
    url: `http://127.0.0.1:${String(port)}`,
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function listenOnEphemeral(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()

      if (addr === null || typeof addr === 'string') {
        reject(new Error('Failed to bind mock server'))
        return
      }

      resolve(addr.port)
    })
  })
}

function trackConnections(server: Server, sockets: Set<Socket>): void {
  server.on('connection', (socket: Socket) => {
    sockets.add(socket)
    socket.on('close', () => {
      sockets.delete(socket)
    })
  })
}

function collectBody(req: IncomingMessage, callback: (body: string) => void): void {
  const chunks: Buffer[] = []

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })

  req.on('end', () => {
    callback(Buffer.concat(chunks).toString())
  })
}

function routeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  options: MockOAuthServerOptions,
  tokenRequests: TokenRequest[],
  deviceAuthRequests: DeviceAuthRequest[],
  state: { pollIndex: number }
): void {
  const url = new URL(req.url ?? '/', `http://127.0.0.1`)

  if (req.method === 'POST' && url.pathname === '/token') {
    handleTokenRequest(req, res, body, options, tokenRequests, state)
    return
  }

  if (req.method === 'POST' && url.pathname === '/device/code') {
    handleDeviceAuthRequest(req, res, body, options, deviceAuthRequests)
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'not_found' }))
}

function handleTokenRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  options: MockOAuthServerOptions,
  tokenRequests: TokenRequest[],
  state: { pollIndex: number }
): void {
  const params = new URLSearchParams(body)
  const headers = extractHeaders(req)

  tokenRequests.push({ headers, params, timestamp: Date.now() })

  const grantType = params.get('grant_type')

  if (grantType === 'authorization_code') {
    handleAuthorizationCodeGrant(res, params, options)
    return
  }

  if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
    handleDeviceCodeGrant(res, params, options, state)
    return
  }

  res.writeHead(400)
  res.end(JSON.stringify({ error: 'unsupported_grant_type' }))
}

function handleAuthorizationCodeGrant(
  res: ServerResponse,
  params: URLSearchParams,
  options: MockOAuthServerOptions
): void {
  const code = params.get('code')
  const clientId = params.get('client_id')
  const codeVerifier = params.get('code_verifier')

  if (clientId !== options.clientId) {
    sendJsonResponse(res, 400, { error: 'invalid_client' })
    return
  }

  if (code !== options.validCode) {
    sendJsonResponse(res, 400, { error: 'invalid_grant' })
    return
  }

  if (options.rejectVerifier === true) {
    sendJsonResponse(res, 400, { error: 'invalid_grant' })
    return
  }

  if (codeVerifier === null || codeVerifier === '') {
    sendJsonResponse(res, 400, { error: 'invalid_grant' })
    return
  }

  if (options.expectedVerifier !== undefined && codeVerifier !== options.expectedVerifier) {
    sendJsonResponse(res, 400, { error: 'invalid_grant' })
    return
  }

  sendJsonResponse(res, 200, {
    access_token: options.accessToken ?? 'mock-access-token',
    token_type: 'bearer',
  })
}

function handleDeviceCodeGrant(
  res: ServerResponse,
  params: URLSearchParams,
  options: MockOAuthServerOptions,
  state: { pollIndex: number }
): void {
  const clientId = params.get('client_id')

  if (clientId !== options.clientId) {
    sendJsonResponse(res, 400, { error: 'invalid_client' })
    return
  }

  const deviceCode = params.get('device_code')

  if (deviceCode !== options.deviceCode) {
    sendJsonResponse(res, 400, { error: 'invalid_grant' })
    return
  }

  const responses = options.devicePollResponses ?? []
  const currentIndex = state.pollIndex

  if (currentIndex >= responses.length) {
    sendJsonResponse(res, 400, { error: 'expired_token' })
    return
  }

  state.pollIndex = currentIndex + 1
  const pollResponse = responses[currentIndex]

  if (pollResponse === undefined) {
    sendJsonResponse(res, 400, { error: 'expired_token' })
    return
  }

  sendDevicePollResponse(res, pollResponse)
}

function sendDevicePollResponse(res: ServerResponse, pollResponse: DevicePollResponse): void {
  if (pollResponse.type === 'success') {
    sendJsonResponse(res, 200, {
      access_token: pollResponse.accessToken,
      token_type: 'bearer',
    })
    return
  }

  if (pollResponse.type === 'pending') {
    sendJsonResponse(res, 400, { error: 'authorization_pending' })
    return
  }

  if (pollResponse.type === 'slow_down') {
    sendJsonResponse(res, 400, { error: 'slow_down' })
    return
  }

  if (pollResponse.type === 'denied') {
    sendJsonResponse(res, 400, { error: 'access_denied' })
    return
  }

  if (pollResponse.type === 'expired') {
    sendJsonResponse(res, 400, { error: 'expired_token' })
  }
}

function handleDeviceAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  options: MockOAuthServerOptions,
  deviceAuthRequests: DeviceAuthRequest[]
): void {
  const params = new URLSearchParams(body)
  const headers = extractHeaders(req)

  deviceAuthRequests.push({ headers, params })

  const clientId = params.get('client_id')

  if (clientId !== options.clientId) {
    sendJsonResponse(res, 400, { error: 'invalid_client' })
    return
  }

  sendJsonResponse(res, 200, {
    device_code: options.deviceCode ?? 'mock-device-code',
    expires_in: 900,
    interval: options.deviceInterval ?? 5,
    user_code: options.userCode ?? 'MOCK-CODE',
    verification_uri: options.verificationUri ?? 'https://example.com/activate',
  })
}

function sendJsonResponse(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function extractHeaders(req: IncomingMessage): Record<string, string | undefined> {
  return {
    'content-type': req.headers['content-type'],
  }
}
