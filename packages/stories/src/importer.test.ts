import Module from 'node:module'

import { withTag } from '@maltty/utils/tag'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMockStory } from './__test__/mock-story.js'
import { createStoryImporter } from './importer.js'
import type { StoryEntry } from './types.js'

type ResolveFilename = (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown
) => string

const moduleInternals = Module as unknown as { _resolveFilename: ResolveFilename }
const originalResolveFilename = moduleInternals._resolveFilename

afterEach(() => {
  moduleInternals._resolveFilename = originalResolveFilename
  vi.restoreAllMocks()
})

/**
 * Replace jiti resolution with a deterministic import implementation.
 *
 * @private
 * @param importModule - The import implementation returned by jiti.
 * @returns The mocked createJiti factory.
 */
function mockJiti(importModule: (filePath: string) => Promise<unknown>) {
  const createJiti = vi.fn(() => ({ import: importModule }))
  const requireJiti = (() => ({ createJiti })) as unknown as ReturnType<typeof Module.createRequire>
  vi.spyOn(Module, 'createRequire').mockReturnValue(requireJiti)
  return createJiti
}

describe('createStoryImporter()', () => {
  it('should create a frozen importer with jiti caching disabled', () => {
    const createJiti = mockJiti(vi.fn())

    const [error, importer] = createStoryImporter()

    expect(error).toBeNull()
    expect(Object.isFrozen(importer)).toBeTruthy()
    expect(createJiti).toHaveBeenCalledWith(expect.stringMatching(/\/importer\.ts$/), {
      fsCache: false,
      moduleCache: false,
      interopDefault: true,
      jsx: { runtime: 'automatic' },
    })
  })

  it('should return a tagged default export', async () => {
    const entry = createMockStory('button')
    mockJiti(vi.fn(() => Promise.resolve({ default: entry })))
    const [, importer] = createStoryImporter()

    const result = await importer?.importStory('/app/button.stories.ts')

    expect(result).toStrictEqual([null, entry])
  })

  it('should return a directly exported story group', async () => {
    const entry = withTag({ title: 'Buttons' }, 'StoryGroup') as StoryEntry
    mockJiti(vi.fn(() => Promise.resolve(entry)))
    const [, importer] = createStoryImporter()

    const result = await importer?.importStory('/app/buttons.stories.ts')

    expect(result).toStrictEqual([null, entry])
  })

  it('should reject modules without a tagged story export', async () => {
    mockJiti(vi.fn(() => Promise.resolve({ default: { name: 'invalid' } })))
    const [, importer] = createStoryImporter()

    const [error, entry] = (await importer?.importStory('/app/invalid.stories.ts')) ?? []

    expect(error?.message).toContain('does not export a valid Story or StoryGroup')
    expect(entry).toBeNull()
  })

  it('should return import failures as errors', async () => {
    mockJiti(vi.fn(() => Promise.reject(new Error('syntax error'))))
    const [, importer] = createStoryImporter()

    const [error, entry] = (await importer?.importStory('/app/broken.stories.ts')) ?? []

    expect(error?.message).toBe('syntax error')
    expect(entry).toBeNull()
  })

  it('should return a setup error when jiti creation fails', () => {
    const createJiti = vi.fn(() => {
      throw new Error('setup failed')
    })
    const requireJiti = (() => ({ createJiti })) as unknown as ReturnType<
      typeof Module.createRequire
    >
    vi.spyOn(Module, 'createRequire').mockReturnValue(requireJiti)

    const [error, importer] = createStoryImporter()

    expect(error?.message).toBe('setup failed')
    expect(importer).toBeNull()
  })

  it('should explain how to install a missing jiti peer', () => {
    vi.spyOn(Module, 'createRequire').mockImplementation(() => {
      throw Object.assign(new Error('missing'), { code: 'MODULE_NOT_FOUND' })
    })

    const [error, importer] = createStoryImporter()

    expect(error?.message).toContain('pnpm add jiti')
    expect(importer).toBeNull()
  })

  it('should preserve unexpected jiti resolution errors', () => {
    vi.spyOn(Module, 'createRequire').mockImplementation(() => {
      throw Object.assign(new Error('blocked'), {
        code: 'MODULE_NOT_FOUND',
        requireStack: ['parent.cjs'],
      })
    })

    const [error, importer] = createStoryImporter()

    expect(error?.message).toBe('blocked')
    expect(importer).toBeNull()
  })

  it('should preserve non-error jiti resolution failures', () => {
    vi.spyOn(Module, 'createRequire').mockImplementation(() => {
      // oxlint-disable-next-line no-throw-literal -- verifies unknown thrown values are normalized
      throw 'blocked'
    })

    const [error, importer] = createStoryImporter()

    expect(error).toBeInstanceOf(Error)
    expect(importer).toBeNull()
  })

  it('should return an error when the module resolver cannot be patched', () => {
    mockJiti(vi.fn())
    moduleInternals._resolveFilename = undefined as unknown as ResolveFilename

    const [error, importer] = createStoryImporter()

    expect(error).toBeInstanceOf(Error)
    expect(importer).toBeNull()
  })

  it('should install the TypeScript resolver only once', () => {
    mockJiti(vi.fn())

    const first = createStoryImporter()
    const patchedResolver = moduleInternals._resolveFilename
    const second = createStoryImporter()

    expect(first[0]).toBeNull()
    expect(second[0]).toBeNull()
    expect(moduleInternals._resolveFilename).toBe(patchedResolver)
  })

  it('should resolve JavaScript specifiers to TypeScript alternatives', () => {
    const baseResolver = vi.fn((request: string): string => {
      if (request === './component.ts' || request === './view.tsx') {
        return `/resolved/${request.slice(2)}`
      }
      throw new Error(`missing ${request}`)
    })
    moduleInternals._resolveFilename = baseResolver
    mockJiti(vi.fn())
    createStoryImporter()

    const jsResult = moduleInternals._resolveFilename('./component.js', undefined, false, undefined)
    const jsxResult = moduleInternals._resolveFilename('./view.jsx', undefined, false, undefined)

    expect(jsResult).toBe('/resolved/component.ts')
    expect(jsxResult).toBe('/resolved/view.tsx')
  })

  it('should preserve successful native resolution', () => {
    vi.spyOn(moduleInternals, '_resolveFilename').mockImplementation(() => '/resolved/native.js')
    mockJiti(vi.fn())
    createStoryImporter()

    const result = moduleInternals._resolveFilename('package', undefined, false, undefined)

    expect(result).toBe('/resolved/native.js')
  })

  it('should rethrow when no alternate extension resolves', () => {
    vi.spyOn(moduleInternals, '_resolveFilename').mockImplementation((request: string) => {
      throw new Error(`missing ${request}`)
    })
    mockJiti(vi.fn())
    createStoryImporter()

    expect(() =>
      moduleInternals._resolveFilename('./missing.js', undefined, false, undefined)
    ).toThrow('missing ./missing.js')
    expect(() =>
      moduleInternals._resolveFilename('./missing.css', undefined, false, undefined)
    ).toThrow('missing ./missing.css')
  })
})
