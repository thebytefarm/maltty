import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readManifest } from './manifest.js'

vi.mock(import('node:fs/promises'), () => ({
  readFile: vi.fn(),
}))

const mockedReadFile = vi.mocked(readFile)

beforeEach(() => {
  vi.clearAllMocks()
})

describe(readManifest, () => {
  it('should return manifest when valid package.json exists', async () => {
    const pkg = {
      author: 'Alice',
      bin: { cli: './bin/cli.js' },
      description: 'A test package',
      homepage: 'https://example.com',
      keywords: ['test', 'example'],
      license: 'MIT',
      name: 'my-pkg',
      repository: 'https://github.com/test/repo',
      version: '1.0.0',
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).toStrictEqual({
      author: 'Alice',
      bin: { cli: './bin/cli.js' },
      description: 'A test package',
      homepage: 'https://example.com',
      keywords: ['test', 'example'],
      license: 'MIT',
      name: 'my-pkg',
      repository: 'https://github.com/test/repo',
      version: '1.0.0',
    })
  })

  it('should return error when file not found', async () => {
    mockedReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'))

    const [error, manifest] = await readManifest('/missing')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeNull()
    const filePath = resolve('/missing', 'package.json')
    expect(error!.message).toContain(`Failed to read ${filePath}`)
    expect(error!.message).toContain('ENOENT')
  })

  it('should return error when file contains invalid JSON', async () => {
    mockedReadFile.mockResolvedValueOnce('{ not valid json }}}')

    const [error, manifest] = await readManifest('/project')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Failed to parse JSON')
  })

  it('should return manifest with undefined for missing optional fields', async () => {
    const pkg = {}
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).toStrictEqual({
      author: undefined,
      bin: undefined,
      description: undefined,
      homepage: undefined,
      keywords: [],
      license: undefined,
      name: undefined,
      repository: undefined,
      version: undefined,
    })
  })

  it('should normalize author object to string', async () => {
    const pkg = {
      author: { email: 'bob@example.com', name: 'Bob', url: 'https://bob.dev' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Bob')
  })

  it('should normalize repository object to URL string', async () => {
    const pkg = {
      repository: {
        directory: 'packages/core',
        type: 'git',
        url: 'https://github.com/test/repo.git',
      },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.repository).toBe('https://github.com/test/repo.git')
  })

  it('should normalize string bin to record', async () => {
    const pkg = {
      bin: './bin/index.js',
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.bin).toStrictEqual({ '': './bin/index.js' })
  })

  it('should pass through keywords array', async () => {
    const pkg = {
      keywords: ['cli', 'tool', 'typescript'],
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.keywords).toStrictEqual(['cli', 'tool', 'typescript'])
  })

  it('should pass through record bin', async () => {
    const pkg = {
      bin: { build: './bin/build.js', serve: './bin/serve.js' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.bin).toStrictEqual({ build: './bin/build.js', serve: './bin/serve.js' })
  })
})

describe('readManifest integration', () => {
  it('should handle author as string', async () => {
    const pkg = { author: 'Jane Doe' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Jane Doe')
  })

  it('should handle author as object with email and url', async () => {
    const pkg = {
      author: {
        email: 'jane@example.com',
        name: 'Jane',
        url: 'https://jane.dev',
      },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Jane')
  })

  it('should handle repository as string', async () => {
    const pkg = { repository: 'github:user/repo' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.repository).toBe('github:user/repo')
  })

  it('should return error for schema validation failure', async () => {
    const pkg = {
      author: { email: 'missing-name@example.com' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Invalid package.json')
  })

  it('should resolve path using provided directory', async () => {
    const pkg = { name: 'test' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    await readManifest('/custom/dir')

    const expectedPath = resolve('/custom/dir', 'package.json')
    expect(mockedReadFile).toHaveBeenCalledWith(expectedPath, 'utf8')
  })
})
