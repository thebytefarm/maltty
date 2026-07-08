/**
 * Faux authenticated API server.
 *
 * A minimal HTTP server that validates bearer tokens and serves
 * user and repository data. Used to demonstrate the maltty auth
 * and http middleware in action.
 *
 * Start with: `pnpm api` or `npx tsx api/server.ts`
 */
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ---------------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------------

const VALID_TOKENS: ReadonlyMap<string, string> = new Map([
  ['tok_alice_12345', 'alice'],
  ['tok_bob_67890', 'bob'],
])

interface User {
  readonly login: string
  readonly id: number
  readonly name: string
  readonly email: string
}

interface Repo {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly private: boolean
  readonly owner: string
}

const USERS: ReadonlyMap<string, User> = new Map([
  ['alice', { login: 'alice', id: 1, name: 'Alice Smith', email: 'alice@example.com' }],
  ['bob', { login: 'bob', id: 2, name: 'Bob Jones', email: 'bob@example.com' }],
])

const REPOS: Repo[] = [
  { id: 1, name: 'acme-cli', full_name: 'alice/acme-cli', private: false, owner: 'alice' },
  {
    id: 2,
    name: 'secret-project',
    full_name: 'alice/secret-project',
    private: true,
    owner: 'alice',
  },
  { id: 3, name: 'bob-tools', full_name: 'bob/bob-tools', private: false, owner: 'bob' },
]

// ---------------------------------------------------------------------------
// PKCE authorization code store
// ---------------------------------------------------------------------------

interface AuthCodeEntry {
  readonly token: string
  readonly codeChallenge: string
  readonly redirectUri: string
  readonly clientId: string
  readonly createdAt: number
}

const AUTH_CODE_TTL_MS = 600_000

const AUTH_CODES: Map<string, AuthCodeEntry> = new Map()

// ---------------------------------------------------------------------------
// Auth + routing
// ---------------------------------------------------------------------------

function extractBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (header === undefined) return null
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7)
}

function authenticateRequest(req: IncomingMessage): string | null {
  const token = extractBearer(req)
  if (token === null) return null
  return VALID_TOKENS.get(token) ?? null
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  })
}

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest('base64url')
  return hash === codeChallenge
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleGetUser(login: string, res: ServerResponse): void {
  const user = USERS.get(login)
  if (user === undefined) {
    sendJson(res, 404, { error: 'User not found' })
    return
  }
  sendJson(res, 200, user)
}

function handleListRepos(login: string, res: ServerResponse): void {
  const userRepos = REPOS.filter((r) => r.owner === login)
  sendJson(res, 200, userRepos)
}

async function handleCreateRepo(
  login: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const raw = await readBody(req)
  try {
    const body = JSON.parse(raw) as { name?: string; private?: boolean }
    const name = body.name ?? 'untitled'
    const isPrivate = body.private ?? false
    const repo: Repo = {
      id: REPOS.length + 1,
      name,
      full_name: `${login}/${name}`,
      private: isPrivate,
      owner: login,
    }
    REPOS.push(repo)
    sendJson(res, 201, repo)
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' })
  }
}

function handleHealth(res: ServerResponse): void {
  sendJson(res, 200, { status: 'ok', uptime: process.uptime() })
}

// ---------------------------------------------------------------------------
// Auth callback (for OAuth flow demo)
// ---------------------------------------------------------------------------

function handleAuthPage(res: ServerResponse, callbackUrl: string | null): void {
  const postScript =
    callbackUrl !== null
      ? [
          `      fetch('${callbackUrl}', {`,
          "        method: 'POST',",
          "        headers: { 'Content-Type': 'application/json' },",
          '        body: JSON.stringify({ token }),',
          '      }).then(function() {',
          "        document.body.innerHTML = '<h1>Authenticated</h1><p>You can close this tab.</p>';",
          '      });',
        ].join('\n')
      : '      document.body.innerHTML = "<h1>Token: " + token + "</h1><p>Copy this token to use with the CLI.</p>";'

  const html = [
    '<!DOCTYPE html>',
    '<html>',
    '<head><title>Login</title><style>',
    '  body { font-family: system-ui; max-width: 400px; margin: 80px auto; }',
    '  button { padding: 10px 24px; font-size: 16px; cursor: pointer; }',
    '  .token-list { margin: 20px 0; }',
    '  .token-list button { display: block; margin: 8px 0; width: 100%; }',
    '</style></head>',
    '<body>',
    '  <h1>Faux Auth Server</h1>',
    '  <p>Select a user to authenticate as:</p>',
    '  <div class="token-list">',
    `    <button onclick="authenticate('tok_alice_12345')">Login as Alice</button>`,
    `    <button onclick="authenticate('tok_bob_67890')">Login as Bob</button>`,
    '  </div>',
    '  <script>',
    '    function authenticate(token) {',
    postScript,
    '    }',
    '  </script>',
    '</body>',
    '</html>',
  ].join('\n')

  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
  res.end(html)
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// PKCE OAuth endpoints
// ---------------------------------------------------------------------------

function handleAuthorizePage(
  res: ServerResponse,
  params: {
    readonly clientId: string
    readonly redirectUri: string
    readonly codeChallenge: string
    readonly state: string
  }
): void {
  const safeClientId = escapeHtml(params.clientId)
  const safeRedirectUri = escapeHtml(params.redirectUri)
  const safeCodeChallenge = escapeHtml(params.codeChallenge)
  const safeState = escapeHtml(params.state)

  const html = [
    '<!DOCTYPE html>',
    '<html>',
    '<head><title>Authorize</title><style>',
    '  body { font-family: system-ui; max-width: 400px; margin: 80px auto; }',
    '  button { padding: 10px 24px; font-size: 16px; cursor: pointer; }',
    '  .user-list { margin: 20px 0; }',
    '  .user-list button { display: block; margin: 8px 0; width: 100%; }',
    '</style></head>',
    '<body>',
    '  <h1>Authorize Application</h1>',
    `  <p><strong>${safeClientId}</strong> is requesting access.</p>`,
    '  <p>Select a user to authorize as:</p>',
    '  <div class="user-list">',
    `    <button onclick="authorize('tok_alice_12345')">Login as Alice</button>`,
    `    <button onclick="authorize('tok_bob_67890')">Login as Bob</button>`,
    '  </div>',
    '  <script>',
    `    var authParams = ${JSON.stringify({ clientId: params.clientId, codeChallenge: params.codeChallenge, redirectUri: params.redirectUri, state: params.state })};`,
    '    function authorize(token) {',
    '      var code = crypto.randomUUID();',
    '      fetch("/authorize/grant", {',
    '        method: "POST",',
    '        headers: { "Content-Type": "application/json" },',
    '        body: JSON.stringify({',
    '          code: code,',
    '          token: token,',
    '          codeChallenge: authParams.codeChallenge,',
    '          redirectUri: authParams.redirectUri,',
    '          clientId: authParams.clientId',
    '        })',
    '      }).then(function() {',
    '        window.location.href = authParams.redirectUri + "?code=" + encodeURIComponent(code) + "&state=" + encodeURIComponent(authParams.state);',
    '      });',
    '    }',
    '  </script>',
    '</body>',
    '</html>',
  ].join('\n')

  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
  res.end(html)
}

async function handleAuthorizeGrant(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req)
  try {
    const body = JSON.parse(raw) as {
      code?: string
      token?: string
      codeChallenge?: string
      redirectUri?: string
      clientId?: string
    }

    if (!body.code || !body.token || !body.codeChallenge || !body.redirectUri || !body.clientId) {
      sendJson(res, 400, { error: 'Missing required fields' })
      return
    }

    AUTH_CODES.set(body.code, {
      token: body.token,
      codeChallenge: body.codeChallenge,
      redirectUri: body.redirectUri,
      clientId: body.clientId,
      createdAt: Date.now(),
    })

    sendJson(res, 200, { ok: true })
  } catch {
    sendJson(res, 400, { error: 'Invalid request' })
  }
}

async function handleToken(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req)
  const params = new URLSearchParams(raw)
  const grantType = params.get('grant_type')
  const code = params.get('code')
  const clientId = params.get('client_id')
  const codeVerifier = params.get('code_verifier')
  const redirectUri = params.get('redirect_uri')

  if (grantType !== 'authorization_code') {
    sendJson(res, 400, { error: 'unsupported_grant_type' })
    return
  }

  if (code === null || clientId === null || codeVerifier === null || redirectUri === null) {
    sendJson(res, 400, { error: 'invalid_request' })
    return
  }

  const entry = AUTH_CODES.get(code)
  if (entry === undefined) {
    sendJson(res, 400, { error: 'invalid_grant' })
    return
  }

  if (Date.now() - entry.createdAt > AUTH_CODE_TTL_MS) {
    AUTH_CODES.delete(code)
    sendJson(res, 400, { error: 'invalid_grant' })
    return
  }

  if (entry.clientId !== clientId || entry.redirectUri !== redirectUri) {
    sendJson(res, 400, { error: 'invalid_grant' })
    return
  }

  if (!verifyPkce(codeVerifier, entry.codeChallenge)) {
    sendJson(res, 400, { error: 'invalid_grant' })
    return
  }

  AUTH_CODES.delete(code)
  sendJson(res, 200, { access_token: entry.token, token_type: 'bearer' })
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${String(PORT)}`)
  const { pathname } = url
  const method = req.method ?? 'GET'

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  // Public routes
  if (pathname === '/health') {
    handleHealth(res)
    return
  }

  if (pathname === '/auth') {
    const callbackUrl = url.searchParams.get('callback_url')
    handleAuthPage(res, callbackUrl)
    return
  }

  // PKCE OAuth routes (public)
  if (pathname === '/authorize' && method === 'GET') {
    handleAuthorizePage(res, {
      clientId: url.searchParams.get('client_id') ?? '',
      codeChallenge: url.searchParams.get('code_challenge') ?? '',
      redirectUri: url.searchParams.get('redirect_uri') ?? '',
      state: url.searchParams.get('state') ?? '',
    })
    return
  }

  if (pathname === '/authorize/grant' && method === 'POST') {
    await handleAuthorizeGrant(req, res)
    return
  }

  if (pathname === '/token' && method === 'POST') {
    await handleToken(req, res)
    return
  }

  // Protected routes — require bearer token
  const login = authenticateRequest(req)
  if (login === null) {
    sendJson(res, 401, { error: 'Unauthorized — provide a valid Bearer token' })
    return
  }

  if (pathname === '/user' && method === 'GET') {
    handleGetUser(login, res)
    return
  }

  if (pathname === '/repos' && method === 'GET') {
    handleListRepos(login, res)
    return
  }

  if (pathname === '/repos' && method === 'POST') {
    await handleCreateRepo(login, req, res)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Faux API server running at http://localhost:${String(PORT)}`)
  console.log('')
  console.log('Public endpoints:')
  console.log(`  GET  http://localhost:${String(PORT)}/health`)
  console.log(`  GET  http://localhost:${String(PORT)}/auth`)
  console.log(`  GET  http://localhost:${String(PORT)}/authorize`)
  console.log(`  POST http://localhost:${String(PORT)}/authorize/grant`)
  console.log(`  POST http://localhost:${String(PORT)}/token`)
  console.log('')
  console.log('Protected endpoints (require Bearer token):')
  console.log(`  GET  http://localhost:${String(PORT)}/user`)
  console.log(`  GET  http://localhost:${String(PORT)}/repos`)
  console.log(`  POST http://localhost:${String(PORT)}/repos`)
  console.log('')
  console.log('Valid tokens:')
  console.log('  Alice: tok_alice_12345')
  console.log('  Bob:   tok_bob_67890')
})
