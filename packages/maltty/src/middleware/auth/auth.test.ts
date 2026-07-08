import { hasTag } from '@maltty/utils/tag'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { auth } from './auth.js'

function createMockCtx(options?: { readonly envToken?: string }) {
  const store = new Map()

  if (options !== undefined && options.envToken !== undefined) {
    vi.stubEnv('TEST_CLI_TOKEN', options.envToken)
  }

  return {
    args: {},
    config: {},
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
    colors: {},
    format: { json: vi.fn(), table: vi.fn() },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      raw: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: {
      command: ['test'],
      dirs: { global: '.test-cli', local: '.test-cli' },
      name: 'test-cli',
      version: '1.0.0',
    },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    dotdir: {
      global: vi.fn(),
      local: vi.fn(),
      protect: vi.fn(),
    },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

describe('auth()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return a Middleware tagged object', () => {
    const mw = auth({ strategies: [{ source: 'env' }] })

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.auth with credential() that resolves from env', async () => {
    const ctx = createMockCtx({ envToken: 'my-secret' })
    const mw = auth({ strategies: [{ source: 'token' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      login: unknown
      authenticated: unknown
      credential: () => unknown
    }

    expect(authCtx.credential()).toStrictEqual({ token: 'my-secret', type: 'bearer' })
  })

  it('should decorate ctx.auth with credential() returning null when nothing found', async () => {
    const ctx = createMockCtx()
    const mw = auth({ strategies: [{ source: 'token' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      login: unknown
      authenticated: unknown
      credential: () => unknown
    }

    expect(authCtx.credential()).toBeNull()
  })

  it('should provide a login function on ctx.auth', async () => {
    const ctx = createMockCtx()
    const mw = auth({ strategies: [{ source: 'token' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      login: unknown
      authenticated: unknown
      credential: unknown
    }

    expect(typeof authCtx.login).toBe('function')
  })

  it('should provide an authenticated function on ctx.auth', async () => {
    const ctx = createMockCtx({ envToken: 'my-secret' })
    const mw = auth({ strategies: [{ source: 'token' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      authenticated: () => boolean
    }

    expect(authCtx.authenticated()).toBeTruthy()
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const mw = auth({ strategies: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should never fail even when no credential found (no required behavior)', async () => {
    const ctx = createMockCtx()
    const mw = auth({ strategies: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(ctx.fail).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

describe('auth.env()', () => {
  it('should return an EnvSourceConfig with source: env', () => {
    const config = auth.env()

    expect(config).toStrictEqual({ source: 'env' })
  })

  it('should include tokenVar when provided', () => {
    const config = auth.env({ tokenVar: 'GH_TOKEN' })

    expect(config).toStrictEqual({ source: 'env', tokenVar: 'GH_TOKEN' })
  })
})

describe('auth.dotenv()', () => {
  it('should return a DotenvSourceConfig with source: dotenv', () => {
    const config = auth.dotenv()

    expect(config).toStrictEqual({ source: 'dotenv' })
  })

  it('should include tokenVar and path when provided', () => {
    const config = auth.dotenv({ path: '.env.local', tokenVar: 'API_TOKEN' })

    expect(config).toStrictEqual({ path: '.env.local', source: 'dotenv', tokenVar: 'API_TOKEN' })
  })
})

describe('auth.file()', () => {
  it('should return a FileSourceConfig with source: file', () => {
    const config = auth.file()

    expect(config).toStrictEqual({ source: 'file' })
  })

  it('should include filename and dirName when provided', () => {
    const config = auth.file({ dirName: '.my-app', filename: 'creds.json' })

    expect(config).toStrictEqual({ dirName: '.my-app', filename: 'creds.json', source: 'file' })
  })
})

describe('auth.oauth()', () => {
  it('should return an OAuthSourceConfig with source: oauth', () => {
    const config = auth.oauth({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toStrictEqual({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      source: 'oauth',
      tokenUrl: 'https://example.com/token',
    })
  })

  it('should include optional fields when provided', () => {
    const config = auth.oauth({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      port: 8080,
      scopes: ['openid'],
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toMatchObject({ port: 8080, scopes: ['openid'], source: 'oauth' })
  })
})

describe('auth.deviceCode()', () => {
  it('should return a DeviceCodeSourceConfig with source: device-code', () => {
    const config = auth.deviceCode({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toStrictEqual({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      source: 'device-code',
      tokenUrl: 'https://example.com/token',
    })
  })

  it('should include optional fields when provided', () => {
    const config = auth.deviceCode({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      pollInterval: 3000,
      scopes: ['read'],
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toMatchObject({ pollInterval: 3000, scopes: ['read'], source: 'device-code' })
  })
})

describe('auth.token()', () => {
  it('should return a TokenSourceConfig with source: token', () => {
    const config = auth.token()

    expect(config).toStrictEqual({ source: 'token' })
  })

  it('should include message when provided', () => {
    const config = auth.token({ message: 'Enter token:' })

    expect(config).toStrictEqual({ message: 'Enter token:', source: 'token' })
  })
})

describe('auth.apiKey()', () => {
  it('should return a TokenSourceConfig with source: token (alias)', () => {
    const config = auth.apiKey()

    expect(config).toStrictEqual({ source: 'token' })
  })

  it('should include message when provided', () => {
    const config = auth.apiKey({ message: 'Enter API key:' })

    expect(config).toStrictEqual({ message: 'Enter API key:', source: 'token' })
  })
})

describe('auth.custom()', () => {
  it('should return a CustomSourceConfig with source: custom and the resolver function', () => {
    const resolver = () => null
    const config = auth.custom(resolver)

    expect(config).toStrictEqual({ resolver, source: 'custom' })
  })
})

describe('auth() dirs override', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should use ctx.meta.dirs when no auth dirs override provided', async () => {
    const ctx = createMockCtx()
    const mw = auth({ strategies: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should accept dirs override without error', async () => {
    const ctx = createMockCtx()
    const mw = auth({ dirs: { global: '.custom' }, strategies: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should accept full dirs override without error', async () => {
    const ctx = createMockCtx()
    const mw = auth({
      dirs: { global: '.custom-global', local: '.custom-local' },
      strategies: [{ source: 'env' }],
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
