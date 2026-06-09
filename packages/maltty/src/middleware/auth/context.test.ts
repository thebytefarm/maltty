import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Prompts } from '@/context/types.js'

import { createAuthContext } from './context.js'

vi.mock(import('./chain.js'), () => ({
  runStrategyChain: vi.fn(),
}))

vi.mock(import('@/lib/store/create-store.js'), () => ({
  createStore: vi.fn(),
}))

import { createStore } from '@/lib/store/create-store.js'

import { runStrategyChain } from './chain.js'

const TEST_DIRS = { global: '.test-cli', local: '.test-cli' } as const
const APP_DIRS = { global: '.my-app', local: '.my-app' } as const

function createMockPrompts(): Prompts {
  return {
    confirm: vi.fn(),
    multiselect: vi.fn(),
    password: vi.fn(),
    select: vi.fn(),
    text: vi.fn(),
  } as unknown as Prompts
}

describe('createAuthContext()', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('credential()', () => {
    it('should return the passively resolved credential', () => {
      const credential = { token: 'saved-token', type: 'bearer' as const }
      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => credential,
        strategies: [],
      })

      expect(ctx.credential()).toEqual(credential)
    })

    it('should return null when no credential is available', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [],
      })

      expect(ctx.credential()).toBeNull()
    })

    it('should call resolveCredential on each invocation', () => {
      const resolver = vi.fn().mockReturnValue(null)
      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: resolver,
        strategies: [],
      })

      ctx.credential()
      ctx.credential()

      expect(resolver).toHaveBeenCalledTimes(2)
    })
  })

  describe('authenticated()', () => {
    it('should return true when a credential exists', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => ({ token: 'x', type: 'bearer' as const }),
        strategies: [],
      })

      expect(ctx.authenticated()).toBeTruthy()
    })

    it('should return false when no credential exists', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [],
      })

      expect(ctx.authenticated()).toBeFalsy()
    })
  })

  describe('login()', () => {
    it('should return credential on success', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
      })

      const [error, result] = await ctx.login()

      expect(error).toBeNull()
      expect(result).toEqual(credential)
    })

    it('should return no_credential error when no strategy produces a credential', async () => {
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
      })

      const [error] = await ctx.login()

      expect(error).toMatchObject({ type: 'no_credential' })
    })

    it('should return save_failed error when store.save fails', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([new Error('disk full'), null]),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
      })

      const [error] = await ctx.login()

      expect(error).toMatchObject({ type: 'save_failed' })
    })

    it('should pass strategies to runStrategyChain', async () => {
      const strategies = [
        { authUrl: 'http://example.com/auth', source: 'oauth' as const },
        { source: 'token' as const },
      ]
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const prompts = createMockPrompts()
      const ctx = createAuthContext({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        resolveCredential: () => null,
        strategies,
      })

      await ctx.login()

      expect(runStrategyChain).toHaveBeenCalledWith({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        strategies,
      })
    })

    it('should use override strategies when provided to login()', async () => {
      const overrideStrategies = [{ source: 'token' as const }]
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const prompts = createMockPrompts()
      const ctx = createAuthContext({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        resolveCredential: () => null,
        strategies: [{ source: 'env' as const }],
      })

      await ctx.login({ strategies: overrideStrategies })

      expect(runStrategyChain).toHaveBeenCalledWith({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        strategies: overrideStrategies,
      })
    })

    it('should use configured strategies when login() called without options', async () => {
      const configuredStrategies = [{ source: 'env' as const }]
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const prompts = createMockPrompts()
      const ctx = createAuthContext({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        resolveCredential: () => null,
        strategies: configuredStrategies,
      })

      await ctx.login()

      expect(runStrategyChain).toHaveBeenCalledWith({
        cliName: 'my-app',
        dirs: APP_DIRS,
        prompts,
        strategies: configuredStrategies,
      })
    })

    it('should call validate with resolved credential before saving', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      const validate = vi.fn().mockResolvedValue([null, credential])
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate,
      })

      await ctx.login()

      expect(validate).toHaveBeenCalledWith(credential)
    })

    it('should return validation_failed error when validate fails', async () => {
      const credential = { token: 'bad-token', type: 'bearer' as const }
      const validate = vi
        .fn()
        .mockResolvedValue([{ message: 'Invalid token', type: 'validation_failed' }, null])
      vi.mocked(runStrategyChain).mockResolvedValue(credential)

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate,
      })

      const [error] = await ctx.login()

      expect(error).toMatchObject({ type: 'validation_failed' })
    })

    it('should not persist credential when validate fails', async () => {
      const credential = { token: 'bad-token', type: 'bearer' as const }
      const validate = vi
        .fn()
        .mockResolvedValue([{ message: 'Invalid token', type: 'validation_failed' }, null])
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      const saveFn = vi.fn()
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: saveFn,
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate,
      })

      await ctx.login()

      expect(saveFn).not.toHaveBeenCalled()
    })

    it('should persist credential when validate succeeds', async () => {
      const credential = { token: 'good-token', type: 'bearer' as const }
      const validate = vi.fn().mockResolvedValue([null, credential])
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      const saveFn = vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json'])
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: saveFn,
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate,
      })

      const [error, result] = await ctx.login()

      expect(error).toBeNull()
      expect(result).toEqual(credential)
      expect(saveFn).toHaveBeenCalledWith('auth.json', credential)
    })

    it('should use login options validate over configured validate', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      const configuredValidate = vi.fn()
      const loginValidate = vi.fn().mockResolvedValue([null, credential])
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate: configuredValidate,
      })

      await ctx.login({ validate: loginValidate })

      expect(loginValidate).toHaveBeenCalledWith(credential)
      expect(configuredValidate).not.toHaveBeenCalled()
    })

    it('should skip validation when no validate provided', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      const saveFn = vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json'])
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: saveFn,
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
      })

      const [error, result] = await ctx.login()

      expect(error).toBeNull()
      expect(result).toEqual(credential)
      expect(saveFn).toHaveBeenCalledWith('auth.json', credential)
    })

    it('should pass transformed credential from validate to store.save', async () => {
      const original = { token: 'raw-token', type: 'bearer' as const }
      const transformed = { token: 'enriched-token', type: 'bearer' as const }
      const validate = vi.fn().mockResolvedValue([null, transformed])
      vi.mocked(runStrategyChain).mockResolvedValue(original)
      const saveFn = vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json'])
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: saveFn,
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [{ source: 'token' }],
        validate,
      })

      const [error, result] = await ctx.login()

      expect(error).toBeNull()
      expect(result).toEqual(transformed)
      expect(saveFn).toHaveBeenCalledWith('auth.json', transformed)
    })
  })

  describe('logout()', () => {
    it('should remove the credential file and return ok', async () => {
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
        save: vi.fn(),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [],
      })

      const [error, filePath] = await ctx.logout()

      expect(error).toBeNull()
      expect(filePath).toBe('/home/.test-cli/auth.json')
    })

    it('should return remove_failed error when store.remove fails', async () => {
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn().mockReturnValue([new Error('permission denied'), null]),
        save: vi.fn(),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        dirs: TEST_DIRS,
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        strategies: [],
      })

      const [error] = await ctx.logout()

      expect(error).toMatchObject({ type: 'remove_failed' })
    })
  })
})
