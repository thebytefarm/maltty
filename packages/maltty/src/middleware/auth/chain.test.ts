import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'), () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock(import('./strategies/file.js'), () => ({
  resolveFromFile: vi.fn(),
}))

vi.mock(import('./strategies/oauth.js'), () => ({
  resolveFromOAuth: vi.fn(),
}))

vi.mock(import('./strategies/device-code.js'), () => ({
  resolveFromDeviceCode: vi.fn(),
}))

import { readFileSync } from 'node:fs'

import type { Prompts } from '@/context/types.js'
import type { ResolvedDirs } from '@/types/index.js'

import { runStrategyChain } from './chain.js'
import { resolveFromDeviceCode } from './strategies/device-code.js'
import { resolveFromDotenv } from './strategies/dotenv.js'
import { resolveFromEnv } from './strategies/env.js'
import { resolveFromFile } from './strategies/file.js'
import { resolveFromOAuth } from './strategies/oauth.js'
import { resolveFromToken } from './strategies/token.js'

describe('resolveFromEnv()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return BearerCredential when env var exists', () => {
    vi.stubEnv('MY_TOKEN', 'abc123')

    const result = resolveFromEnv({ tokenVar: 'MY_TOKEN' })

    expect(result).toEqual({ token: 'abc123', type: 'bearer' })
  })

  it('should return null when env var is not set', () => {
    const result = resolveFromEnv({ tokenVar: 'NONEXISTENT_VAR' })

    expect(result).toBeNull()
  })

  it('should return null when env var is empty string', () => {
    vi.stubEnv('EMPTY_TOKEN', '')

    const result = resolveFromEnv({ tokenVar: 'EMPTY_TOKEN' })

    expect(result).toBeNull()
  })
})

describe('resolveFromDotenv()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return BearerCredential when variable found in .env file', () => {
    vi.mocked(readFileSync).mockReturnValue('MY_TOKEN=secret-value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toEqual({ token: 'secret-value', type: 'bearer' })
  })

  it('should return null when .env file does not exist', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when variable not in .env file', () => {
    vi.mocked(readFileSync).mockReturnValue('OTHER_VAR=value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when readFileSync throws', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('read error')
    })

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })
})

describe('resolveFromToken()', () => {
  it('should return BearerCredential when user provides input', async () => {
    const prompts = { password: vi.fn().mockResolvedValue('user-token') } as unknown as Prompts

    const result = await resolveFromToken({ prompts, message: 'Enter token' })

    expect(result).toEqual({ token: 'user-token', type: 'bearer' })
  })

  it('should return null when user cancels prompt', async () => {
    const prompts = {
      password: vi.fn().mockRejectedValue(new Error('cancelled')),
    } as unknown as Prompts

    const result = await resolveFromToken({ prompts, message: 'Enter token' })

    expect(result).toBeNull()
  })

  it('should return null when user provides empty input', async () => {
    const prompts = { password: vi.fn().mockResolvedValue('') } as unknown as Prompts

    const result = await resolveFromToken({ prompts, message: 'Enter token' })

    expect(result).toBeNull()
  })
})

const DEFAULT_DIRS: ResolvedDirs = { global: '.my-cli', local: '.my-cli' }

describe('runStrategyChain()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('should return first resolved credential (short-circuit)', async () => {
    vi.stubEnv('MY_CLI_TOKEN', 'from-env')

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [{ source: 'env' }, { source: 'token' }],
    })

    expect(result).toEqual({ token: 'from-env', type: 'bearer' })
    expect(prompts.password).not.toHaveBeenCalled()
  })

  it('should return null when all strategies return null', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [{ source: 'env' }],
    })

    expect(result).toBeNull()
  })

  it('should derive tokenVar from CLI name (kebab-case to SCREAMING_SNAKE_CASE + _TOKEN)', async () => {
    vi.stubEnv('MY_COOL_APP_TOKEN', 'derived-token')

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cool-app',
      dirs: { global: '.my-cool-app', local: '.my-cool-app' },
      prompts,
      strategies: [{ source: 'env' }],
    })

    expect(result).toEqual({ token: 'derived-token', type: 'bearer' })
  })

  it('should try strategies in order', async () => {
    const prompts = {
      password: vi.fn().mockResolvedValue('from-prompt'),
    } as unknown as Prompts

    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [{ source: 'env' }, { source: 'token' }],
    })

    expect(result).toEqual({ token: 'from-prompt', type: 'bearer' })
    expect(prompts.password).toHaveBeenCalled()
  })

  it('should use custom resolver', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [
        {
          resolver: () => ({ token: 'custom', type: 'bearer' as const }),
          source: 'custom' as const,
        },
      ],
    })

    expect(result).toEqual({ token: 'custom', type: 'bearer' })
  })

  it('should dispatch to file strategy with default filename and dirName', async () => {
    vi.mocked(resolveFromFile).mockReturnValue({ token: 'from-file', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [{ source: 'file' }],
    })

    expect(result).toEqual({ token: 'from-file', type: 'bearer' })
    expect(resolveFromFile).toHaveBeenCalledWith({
      filename: 'auth.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })
  })

  it('should dispatch to file strategy with custom filename and dirName', async () => {
    vi.mocked(resolveFromFile).mockReturnValue({ token: 'from-custom-file', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [{ dirName: '.my-custom-dir', filename: 'creds.json', source: 'file' }],
    })

    expect(result).toEqual({ token: 'from-custom-file', type: 'bearer' })
    expect(resolveFromFile).toHaveBeenCalledWith({
      filename: 'creds.json',
      globalDirName: '.my-custom-dir',
      localDirName: '.my-custom-dir',
    })
  })

  it('should pass separate local and global dirs to resolveFromFile', async () => {
    vi.mocked(resolveFromFile).mockReturnValue({ token: 'from-file', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    await runStrategyChain({
      cliName: 'my-cli',
      dirs: { global: '.my-global', local: '.my-local' },
      prompts,
      strategies: [{ source: 'file' }],
    })

    expect(resolveFromFile).toHaveBeenCalledWith({
      filename: 'auth.json',
      globalDirName: '.my-global',
      localDirName: '.my-local',
    })
  })

  it('should dispatch to oauth strategy with PKCE fields', async () => {
    vi.mocked(resolveFromOAuth).mockResolvedValue({ token: 'from-oauth', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [
        {
          authUrl: 'https://auth.example.com/authorize',
          clientId: 'my-client',
          source: 'oauth',
          tokenUrl: 'https://auth.example.com/token',
        },
      ],
    })

    expect(result).toEqual({ token: 'from-oauth', type: 'bearer' })
    expect(resolveFromOAuth).toHaveBeenCalledWith({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'my-client',
      port: 0,
      scopes: [],
      timeout: 120_000,
      tokenUrl: 'https://auth.example.com/token',
    })
  })

  it('should dispatch to device-code strategy', async () => {
    vi.mocked(resolveFromDeviceCode).mockResolvedValue({
      token: 'from-device',
      type: 'bearer',
    })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [
        {
          clientId: 'my-client',
          deviceAuthUrl: 'https://auth.example.com/device/code',
          source: 'device-code',
          tokenUrl: 'https://auth.example.com/token',
        },
      ],
    })

    expect(result).toEqual({ token: 'from-device', type: 'bearer' })
    expect(resolveFromDeviceCode).toHaveBeenCalledWith({
      clientId: 'my-client',
      deviceAuthUrl: 'https://auth.example.com/device/code',
      openBrowserOnStart: true,
      pollInterval: 5000,
      prompts,
      scopes: [],
      timeout: 300_000,
      tokenUrl: 'https://auth.example.com/token',
    })
  })

  it('should return null when custom resolver returns null', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [
        {
          resolver: () => null,
          source: 'custom' as const,
        },
      ],
    })

    expect(result).toBeNull()
  })

  it('should handle empty strategies array', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await runStrategyChain({
      cliName: 'my-cli',
      dirs: DEFAULT_DIRS,
      prompts,
      strategies: [],
    })

    expect(result).toBeNull()
  })
})
