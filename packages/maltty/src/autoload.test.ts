import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { hasTag, withTag } from '@maltty/utils/tag'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { autoload } from './autoload.js'

vi.mock(import('node:fs/promises'), () => ({
  readdir: vi.fn(),
}))

const { mockPathToFileURL } = vi.hoisted(() => ({
  mockPathToFileURL: vi.fn((p: string) => ({ href: p })),
}))

vi.mock(import('node:url'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    pathToFileURL: mockPathToFileURL,
  }
})

function makeDirent(name: string, isFile: boolean): Dirent {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => !isFile,
    isFIFO: () => false,
    isFile: () => isFile,
    isSocket: () => false,
    isSymbolicLink: () => false,
    name,
    parentPath: '',
    path: '',
  } as Dirent
}

const mockedReaddir = vi.mocked(readdir)

describe('autoload()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockPathToFileURL.mockImplementation((p: string) => ({ href: p }))
  })

  it('should return empty CommandMap for empty directory', async () => {
    mockedReaddir.mockResolvedValue([] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should ignore files starting with underscore', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('_helpers.ts', true)] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should ignore files starting with dot', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('.hidden.ts', true)] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should ignore directories starting with underscore', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('_internal', false)] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should ignore directories starting with dot', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('.hidden', false)] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should import command files and derive names from filenames', async () => {
    mockedReaddir.mockResolvedValue([
      makeDirent('init.ts', true),
      makeDirent('doctor.ts', true),
    ] as unknown as Dirent[])

    vi.doMock('/tmp/commands/init.ts', () => ({
      default: withTag({ description: 'Initialize project' }, 'Command'),
    }))
    vi.doMock('/tmp/commands/doctor.ts', () => ({
      default: withTag({ description: 'Run diagnostics' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(hasTag(result['init'], 'Command')).toBeTruthy()
    expect(result['init'].description).toBe('Initialize project')
    expect(hasTag(result['doctor'], 'Command')).toBeTruthy()
    expect(result['doctor'].description).toBe('Run diagnostics')
  })

  it('should skip files without valid Command default export', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('utils.ts', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/utils.ts', () => ({
      default: { notACommand: true },
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should skip index.ts files in the root scan', async () => {
    mockedReaddir.mockResolvedValue([
      makeDirent('index.ts', true),
      makeDirent('init.ts', true),
    ] as unknown as Dirent[])

    vi.doMock('/tmp/commands/init.ts', () => ({
      default: withTag({ description: 'Init' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result['index']).toBeUndefined()
    expect(hasTag(result['init'], 'Command')).toBeTruthy()
  })

  it('should handle subdirectory with index.ts as parent command', async () => {
    mockedReaddir
      .mockResolvedValueOnce([makeDirent('generate', false)] as unknown as Dirent[])
      .mockResolvedValueOnce([
        makeDirent('index.ts', true),
        makeDirent('command.ts', true),
        makeDirent('middleware.ts', true),
      ] as unknown as Dirent[])

    vi.doMock('/tmp/commands/generate/index.ts', () => ({
      default: withTag({ description: 'Generate things' }, 'Command'),
    }))
    vi.doMock('/tmp/commands/generate/command.ts', () => ({
      default: withTag({ description: 'Generate command' }, 'Command'),
    }))
    vi.doMock('/tmp/commands/generate/middleware.ts', () => ({
      default: withTag({ description: 'Generate middleware' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })
    const { generate } = result

    expect(generate).toBeDefined()
    expect(hasTag(generate, 'Command')).toBeTruthy()
    expect(generate.description).toBe('Generate things')
    expect(generate.commands).toBeDefined()
    const generateCmds = generate.commands as Record<string, unknown>
    expect(hasTag(generateCmds['command'], 'Command')).toBeTruthy()
    expect(hasTag(generateCmds['middleware'], 'Command')).toBeTruthy()
  })

  it('should create group command for subdirectory without index.ts', async () => {
    mockedReaddir
      .mockResolvedValueOnce([makeDirent('tools', false)] as unknown as Dirent[])
      .mockResolvedValueOnce([makeDirent('lint.ts', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/tools/lint.ts', () => ({
      default: withTag({ description: 'Run linter' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result['tools']).toBeDefined()
    expect(hasTag(result['tools'], 'Command')).toBeTruthy()
    expect(result['tools'].handler).toBeUndefined()
    expect(result['tools'].commands).toBeDefined()
    const toolsCmds = result['tools'].commands as Record<string, unknown>
    expect(hasTag(toolsCmds['lint'], 'Command')).toBeTruthy()
  })

  it('should skip empty subdirectories', async () => {
    mockedReaddir
      .mockResolvedValueOnce([makeDirent('empty', false)] as unknown as Dirent[])
      .mockResolvedValueOnce([] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result['empty']).toBeUndefined()
  })

  it('should default to ./commands when no dir option is provided', async () => {
    mockedReaddir.mockResolvedValue([] as unknown as Dirent[])

    await autoload()

    expect(mockedReaddir).toHaveBeenCalledWith(resolve('./commands'), { withFileTypes: true })
  })

  it('should resolve relative dir paths', async () => {
    mockedReaddir.mockResolvedValue([] as unknown as Dirent[])

    await autoload({ dir: './my-commands' })

    expect(mockedReaddir).toHaveBeenCalledWith(resolve('./my-commands'), { withFileTypes: true })
  })

  it('should handle .js extension files', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('deploy.js', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/deploy.js', () => ({
      default: withTag({ description: 'Deploy app' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(hasTag(result['deploy'], 'Command')).toBeTruthy()
    expect(result['deploy'].description).toBe('Deploy app')
  })

  it('should ignore .d.ts declaration files', async () => {
    mockedReaddir.mockResolvedValue([
      makeDirent('build.d.ts', true),
      makeDirent('init.d.ts', true),
      makeDirent('init.ts', true),
    ] as unknown as Dirent[])

    vi.doMock('/tmp/commands/init.ts', () => ({
      default: withTag({ description: 'Init' }, 'Command'),
    }))

    const result = await autoload({ dir: '/tmp/commands' })

    expect(Object.keys(result)).toStrictEqual(['init'])
    expect(hasTag(result['init'], 'Command')).toBeTruthy()
  })

  it('should skip files that throw during import', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('broken.ts', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/broken.ts', () =>
      Promise.reject(new Error('Module has no valid export'))
    )

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })

  it('should log import errors when MALTTY_DEBUG is enabled', async () => {
    process.env.MALTTY_DEBUG = 'true'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    mockedReaddir.mockResolvedValue([makeDirent('broken.ts', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/broken.ts', () =>
      Promise.reject(new Error('Module has no valid export'))
    )

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[maltty] failed to import command from'),
      expect.any(Error)
    )

    delete process.env.MALTTY_DEBUG
    warnSpy.mockRestore()
  })

  it('should convert filesystem paths to file:// URLs before importing (Windows compat)', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('build.ts', true)] as unknown as Dirent[])

    vi.doMock('/tmp/commands/build.ts', () => ({
      default: withTag({ description: 'Build' }, 'Command'),
    }))

    await autoload({ dir: '/tmp/commands' })

    expect(mockPathToFileURL).toHaveBeenCalledWith('/tmp/commands/build.ts')
  })

  it('should ignore non-ts/js files', async () => {
    mockedReaddir.mockResolvedValue([
      makeDirent('readme.md', true),
      makeDirent('data.json', true),
    ] as unknown as Dirent[])

    const result = await autoload({ dir: '/tmp/commands' })

    expect(result).toEqual({})
  })
})
