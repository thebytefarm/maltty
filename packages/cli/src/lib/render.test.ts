import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderTemplate } from './render.js'

const mockParseAndRender = vi.hoisted(() => vi.fn())

vi.mock(import('node:fs/promises'), () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}))

vi.mock(import('liquidjs'), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    Liquid: vi.fn().mockImplementation(
      class {
        parseAndRender = mockParseAndRender
      }
    ),
  }
})

const mockedReaddir = vi.mocked(readdir) as unknown as ReturnType<typeof vi.fn>
const mockedReadFile = vi.mocked(readFile) as unknown as ReturnType<typeof vi.fn>

function makeDirent(name: string, parentPath: string): Dirent {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => false,
    isFIFO: () => false,
    isFile: () => true,
    isSocket: () => false,
    isSymbolicLink: () => false,
    name,
    parentPath,
  } as unknown as Dirent
}

describe('renderTemplate()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no liquid files found', async () => {
    mockedReaddir.mockResolvedValue([])

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: {},
    })

    expect(error).toBeNull()
    expect(result).toStrictEqual([])
  })

  it('should render a simple template with variables', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('hello.ts.liquid', '/templates')])
    mockedReadFile.mockResolvedValue('Hello {{ name }}!')
    mockParseAndRender.mockResolvedValue('Hello world!')

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: { name: 'world' },
    })

    expect(error).toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0]!.relativePath).toBe('hello.ts')
    expect(result![0]!.content).toBe('Hello world!')
  })

  it('should strip .liquid extension from output paths', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('package.json.liquid', '/templates')])
    mockedReadFile.mockResolvedValue('{}')
    mockParseAndRender.mockResolvedValue('{}')

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: {},
    })

    expect(error).toBeNull()
    expect(result![0]!.relativePath).toBe('package.json')
  })

  it('should rename gitignore to .gitignore in output path', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('gitignore.liquid', '/templates')])
    mockedReadFile.mockResolvedValue('node_modules/')
    mockParseAndRender.mockResolvedValue('node_modules/')

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: {},
    })

    expect(error).toBeNull()
    expect(result![0]!.relativePath).toBe('.gitignore')
  })

  it('should handle nested directory templates', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('index.ts.liquid', '/templates/src')])
    mockedReadFile.mockResolvedValue('export {}')
    mockParseAndRender.mockResolvedValue('export {}')

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: {},
    })

    expect(error).toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0]!.relativePath).toBe('src/index.ts')
  })

  it('should return error result on render failure', async () => {
    mockedReaddir.mockResolvedValue([makeDirent('bad.liquid', '/templates')])
    mockedReadFile.mockRejectedValue(new Error('File not found'))

    const [error, result] = await renderTemplate({
      templateDir: '/templates',
      variables: {},
    })

    expect(error).not.toBeNull()
    expect(error!.type).toBe('render_error')
    expect(result).toBeNull()
  })
})
