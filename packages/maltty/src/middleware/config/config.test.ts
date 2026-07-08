import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createContext } from '@/context/index.js'

import { config } from './config.js'
import type { ConfigHandle } from './types.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  spinner: vi.fn(() => mockSpinnerInstance),
}))

const schema = z.object({
  name: z.string(),
  port: z.number().default(3000),
})

type TestConfig = z.infer<typeof schema>

const validConfig: TestConfig = { name: 'test-app', port: 8080 }

function createTmpDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'maltty-config-mw-')))
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}

function createTestContext(): ReturnType<typeof createContext> {
  return createContext({
    args: {},
    argv: ['my-cli', 'test'],
    meta: {
      command: ['test'],
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    },
  })
}

function writeConfig(dir: string, data: Record<string, unknown>): void {
  writeFileSync(join(dir, 'my-cli.config.json'), JSON.stringify(data, null, 2))
}

function getHandle<T = TestConfig>(ctx: ReturnType<typeof createContext>): ConfigHandle<T> {
  return (ctx as unknown as Record<string, unknown>).config as ConfigHandle<T>
}

describe('config middleware', () => {
  const originalCwd = process.cwd()

  afterEach(() => {
    process.chdir(originalCwd)
  })

  describe('lazy mode (default)', () => {
    it('should decorate ctx.config as a handle with load()', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      const next = vi.fn(() => Promise.resolve())

      await mw.handler(ctx, next)

      const handle = getHandle(ctx)
      expect(handle).toBeDefined()
      expect(typeof handle.load).toBe('function')
      expect(next).toHaveBeenCalledOnce()

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should load config from disk when load() is called', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load()

      expect(result).not.toBeNull()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should return null when config validation fails', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load()

      expect(result).toBeNull()

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('exitOnError', () => {
    it('should return config directly with exitOnError', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load({ exitOnError: true })

      expect(result.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should call ctx.fail() when exitOnError and load fails', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      await expect(getHandle(ctx).load({ exitOnError: true })).rejects.toThrow(
        'Failed to load config'
      )

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('caching', () => {
    it('should return cached result on subsequent load() calls', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = getHandle(ctx)
      const first = await handle.load()
      const second = await handle.load()

      expect(first).toBe(second)

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should not cache null results', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = getHandle(ctx)
      const first = await handle.load()
      expect(first).toBeNull()

      const second = await handle.load()
      expect(second).toBeNull()

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('eager mode', () => {
    it('should pre-load config during middleware pass', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ eager: true, schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load()

      expect(result).not.toBeNull()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should call ctx.fail() when eager load fails validation', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ eager: true, schema })

      await expect(
        mw.handler(
          ctx,
          vi.fn(() => Promise.resolve())
        )
      ).rejects.toThrow('Failed to load config')

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('layered load', () => {
    it('should merge layers and return layer metadata', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load({ layers: true })

      expect(result).not.toBeNull()
      expect(result!.layers).toBeDefined()
      expect(result!.layers).toHaveLength(3)
      expect(result!.layers!.map((l) => l.name)).toStrictEqual(['global', 'project', 'local'])

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('single-layer load', () => {
    it('should load config from the project layer', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle(ctx).load({ layer: 'project' })

      expect(result).not.toBeNull()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('empty config validation', () => {
    it('should return null when empty config fails schema validation', async () => {
      const tmpDir = createTmpDir()
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const strictSchema = z.object({ name: z.string() })
      const mw = config({ schema: strictSchema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle<unknown>(ctx).load()

      expect(result).toBeNull()

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should apply schema defaults when no file exists', async () => {
      const tmpDir = createTmpDir()
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const defaultSchema = z.object({ port: z.number().default(3000) })
      const mw = config({ schema: defaultSchema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const result = await getHandle<{ port: number }>(ctx).load()

      expect(result).not.toBeNull()
      expect(result!.config.port).toBe(3000)

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })
})
