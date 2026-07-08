import { describe, expect, it } from 'vitest'

import { redactObject } from './redact.js'

describe('redactObject()', () => {
  // -- Top-level keys --
  it('redacts a top-level "password" field', () => {
    const obj = { password: 'hunter2', username: 'admin' }
    const result = redactObject(obj)
    expect(result.password).toBe('[REDACTED]')
    expect(result.username).toBe('admin')
  })

  it('redacts a top-level "token" field', () => {
    const obj = { token: 'abc123' }
    const result = redactObject(obj)
    expect(result.token).toBe('[REDACTED]')
  })

  it('redacts a top-level "apiKey" field', () => {
    const obj = { apiKey: 'key-value', name: 'test' }
    const result = redactObject(obj)
    expect(result.apiKey).toBe('[REDACTED]')
    expect(result.name).toBe('test')
  })

  it('redacts a top-level "api_key" field', () => {
    const obj = { api_key: 'value' }
    expect(redactObject(obj).api_key).toBe('[REDACTED]')
  })

  it('redacts a top-level "secret" field', () => {
    const obj = { secret: 'shh' }
    expect(redactObject(obj).secret).toBe('[REDACTED]')
  })

  it('redacts a top-level "apiSecret" field', () => {
    const obj = { apiSecret: 'val' }
    expect(redactObject(obj).apiSecret).toBe('[REDACTED]')
  })

  it('redacts a top-level "api_secret" field', () => {
    const obj = { api_secret: 'val' }
    expect(redactObject(obj).api_secret).toBe('[REDACTED]')
  })

  it('redacts a top-level "authorization" field', () => {
    const obj = { authorization: 'Bearer xyz' }
    expect(redactObject(obj).authorization).toBe('[REDACTED]')
  })

  it('redacts a top-level "auth" field', () => {
    const obj = { auth: 'token' }
    expect(redactObject(obj).auth).toBe('[REDACTED]')
  })

  it('redacts a top-level "credentials" field', () => {
    const obj = { credentials: 'creds' }
    expect(redactObject(obj).credentials).toBe('[REDACTED]')
  })

  it('redacts a top-level "private_key" field', () => {
    const obj = { private_key: 'pk' }
    expect(redactObject(obj).private_key).toBe('[REDACTED]')
  })

  it('redacts a top-level "privateKey" field', () => {
    const obj = { privateKey: 'pk' }
    expect(redactObject(obj).privateKey).toBe('[REDACTED]')
  })

  // -- Wildcard paths (*.key) --
  it('redacts nested "password" at any depth', () => {
    const obj = { database: { host: 'localhost', password: 's3cret' } }
    const result = redactObject(obj)
    expect(result.database.password).toBe('[REDACTED]')
    expect(result.database.host).toBe('localhost')
  })

  it('redacts nested "secret" at any depth', () => {
    const obj = { service: { name: 'api', secret: 'hidden' } }
    const result = redactObject(obj)
    expect(result.service.secret).toBe('[REDACTED]')
    expect(result.service.name).toBe('api')
  })

  it('redacts nested "token" at any depth', () => {
    const obj = { provider: { token: 'tkn', url: 'http://x' } }
    const result = redactObject(obj)
    expect(result.provider.token).toBe('[REDACTED]')
    expect(result.provider.url).toBe('http://x')
  })

  it('redacts nested "apiKey" at any depth', () => {
    const obj = { integration: { apiKey: 'key123', enabled: true } }
    const result = redactObject(obj)
    expect(result.integration.apiKey).toBe('[REDACTED]')
    expect(result.integration.enabled).toBeTruthy()
  })

  it('redacts nested "api_key" at any depth', () => {
    const obj = { ext: { api_key: 'k' } }
    expect(redactObject(obj).ext.api_key).toBe('[REDACTED]')
  })

  // -- Specific nested paths --
  it('redacts headers.authorization', () => {
    const obj = { headers: { authorization: 'Bearer abc', 'content-type': 'application/json' } }
    const result = redactObject(obj)
    expect(result.headers.authorization).toBe('[REDACTED]')
    expect(result.headers['content-type']).toBe('application/json')
  })

  it('redacts headers.Authorization (capitalized)', () => {
    const obj = { headers: { Authorization: 'Bearer xyz' } }
    expect(redactObject(obj).headers.Authorization).toBe('[REDACTED]')
  })

  it('redacts config.token', () => {
    const obj = { config: { debug: false, token: 'tok' } }
    const result = redactObject(obj)
    expect(result.config.token).toBe('[REDACTED]')
    expect(result.config.debug).toBeFalsy()
  })

  it('redacts config.apiKey', () => {
    const obj = { config: { apiKey: 'key' } }
    expect(redactObject(obj).config.apiKey).toBe('[REDACTED]')
  })

  it('redacts env.GITHUB_TOKEN', () => {
    const obj = { env: { GITHUB_TOKEN: 'ghp_abc', NODE_ENV: 'production' } }
    const result = redactObject(obj)
    expect(result.env.GITHUB_TOKEN).toBe('[REDACTED]')
    expect(result.env.NODE_ENV).toBe('production')
  })

  it('redacts env.LINEAR_API_KEY', () => {
    const obj = { env: { LINEAR_API_KEY: 'lin_key_123' } }
    expect(redactObject(obj).env.LINEAR_API_KEY).toBe('[REDACTED]')
  })

  // -- Deep nesting --
  it('redacts deeply nested sensitive keys', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            password: 'deep-secret',
            value: 42,
          },
        },
      },
    }
    const result = redactObject(obj)
    expect(result.level1.level2.level3.password).toBe('[REDACTED]')
    expect(result.level1.level2.level3.value).toBe(42)
  })

  // -- Arrays of objects --
  it('redacts sensitive keys inside arrays of objects', () => {
    const obj = {
      users: [
        { name: 'Alice', password: 'pass1' },
        { name: 'Bob', password: 'pass2' },
      ],
    }
    const result = redactObject(obj)
    expect(result.users[0]!.name).toBe('Alice')
    expect(result.users[0]!.password).toBe('[REDACTED]')
    expect(result.users[1]!.name).toBe('Bob')
    expect(result.users[1]!.password).toBe('[REDACTED]')
  })

  it('skips non-object items in arrays', () => {
    const obj = {
      tags: ['public', 'v2', 42, null, true],
    }
    const result = redactObject(obj)
    expect(result.tags).toEqual(['public', 'v2', 42, null, true])
  })

  it('handles nested arrays of objects with sensitive keys', () => {
    const obj = {
      services: [
        { config: { token: 'tok1' }, name: 'svc1' },
        { config: { token: 'tok2' }, name: 'svc2' },
      ],
    }
    const result = redactObject(obj)
    expect(result.services[0]!.config.token).toBe('[REDACTED]')
    expect(result.services[1]!.config.token).toBe('[REDACTED]')
    expect(result.services[0]!.name).toBe('svc1')
  })

  // -- null / undefined values should NOT be redacted --
  it('does NOT redact null values even on sensitive keys', () => {
    const obj = { password: null, token: null } as { password: string | null; token: string | null }
    const result = redactObject(obj)
    expect(result.password).toBeNull()
    expect(result.token).toBeNull()
  })

  it('does NOT redact undefined values even on sensitive keys', () => {
    const obj = { name: 'test', password: undefined } as {
      name: string
      password: string | undefined
    }
    const result = redactObject(obj)
    expect(result.password).toBeUndefined()
    expect(result.name).toBe('test')
  })

  // -- Non-matching keys are preserved --
  it('preserves non-sensitive keys untouched', () => {
    const obj = {
      database: 'mydb',
      host: 'localhost',
      port: 5432,
      ssl: true,
      tags: ['prod', 'us-east'],
    }
    const result = redactObject(obj)
    expect(result).toEqual(obj)
  })

  // -- Does not mutate original --
  it('does not mutate the original object', () => {
    const obj = { nested: { token: 'tok' }, password: 'original' }
    const result = redactObject(obj)
    expect(obj.password).toBe('original')
    expect(obj.nested.token).toBe('tok')
    expect(result.password).toBe('[REDACTED]')
    expect(result.nested.token).toBe('[REDACTED]')
  })

  // -- Empty object --
  it('handles an empty object', () => {
    const result = redactObject({})
    expect(result).toEqual({})
  })

  // -- Mixed sensitive and non-sensitive at multiple levels --
  it('correctly handles a complex object with mixed keys', () => {
    const obj = {
      auth: 'my-auth-token',
      config: {
        apiKey: 'the-key',
        debug: true,
      },
      env: {
        GITHUB_TOKEN: 'ghp_xxx',
        LINEAR_API_KEY: 'lin_yyy',
        NODE_ENV: 'production',
        PORT: '3000',
      },
      headers: {
        Authorization: 'Bearer xyz',
        'Content-Type': 'application/json',
      },
      items: [
        { id: 1, label: 'first', secret: 'item-secret' },
        { id: 2, label: 'second' },
      ],
      name: 'my-app',
      version: '1.0.0',
    }
    const result = redactObject(obj)
    expect(result.name).toBe('my-app')
    expect(result.version).toBe('1.0.0')
    expect(result.auth).toBe('[REDACTED]')
    expect(result.config.apiKey).toBe('[REDACTED]')
    expect(result.config.debug).toBeTruthy()
    expect(result.headers.Authorization).toBe('[REDACTED]')
    expect(result.headers['Content-Type']).toBe('application/json')
    expect(result.env.GITHUB_TOKEN).toBe('[REDACTED]')
    expect(result.env.LINEAR_API_KEY).toBe('[REDACTED]')
    expect(result.env.NODE_ENV).toBe('production')
    expect(result.env.PORT).toBe('3000')
    expect(result.items[0]!.id).toBe(1)
    expect(result.items[0]!.secret).toBe('[REDACTED]')
    expect(result.items[0]!.label).toBe('first')
    expect(result.items[1]!.id).toBe(2)
    expect(result.items[1]!.label).toBe('second')
  })

  // -- Numeric and boolean values on sensitive keys are redacted --
  it('redacts non-string truthy values on sensitive keys', () => {
    const obj = { secret: true, token: 12_345 }
    const result = redactObject(obj as Record<string, unknown>)
    expect(result.token).toBe('[REDACTED]')
    expect(result.secret).toBe('[REDACTED]')
  })

  // -- Object values on sensitive keys are redacted --
  it('redacts object values on sensitive keys', () => {
    const obj = { password: { hash: 'abc', salt: 'xyz' } }
    const result = redactObject(obj)
    expect(result.password).toBe('[REDACTED]')
  })
})
