import { describe, expect, it, vi } from 'vitest'

import { createMockStory } from './__test__/mock-story.js'
import { discoverStories } from './discover.js'
import type { StoryImporter } from './importer.js'
import type { StoryEntry } from './types.js'

function createMockImporter(
  handler: (filePath: string) => Promise<[Error, null] | [null, StoryEntry]>
): StoryImporter {
  return Object.freeze({
    importStory: handler,
  })
}

vi.mock(import('node:fs/promises'), () => ({
  glob: vi.fn(),
}))

describe('story discovery', () => {
  it('should return empty results when no files match', async () => {
    const { glob } = await import('node:fs/promises')
    vi.mocked(glob).mockReturnValue(asyncIterableOf([]))

    const importer = createMockImporter(async () => [new Error('should not be called'), null])

    const result = await discoverStories({ importer, cwd: '/project' })

    expect(result.entries.size).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('should collect entries from matched files', async () => {
    const { glob } = await import('node:fs/promises')
    vi.mocked(glob).mockReturnValue(asyncIterableOf(['button.stories.ts']))

    const entry = createMockStory('button')
    const importer = createMockImporter(async () => [null, entry])

    const result = await discoverStories({
      importer,
      cwd: '/project',
      include: ['**/*.stories.ts'],
    })

    expect(result.entries.size).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it('should collect errors when import fails', async () => {
    const { glob } = await import('node:fs/promises')
    vi.mocked(glob).mockReturnValue(asyncIterableOf(['broken.stories.ts']))

    const importer = createMockImporter(async () => [new Error('parse error'), null])

    const result = await discoverStories({
      importer,
      cwd: '/project',
      include: ['**/*.stories.ts'],
    })

    expect(result.entries.size).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBe('parse error')
  })
})

// ---------------------------------------------------------------------------

/**
 * Create an async iterable from an array of values.
 *
 * @private
 * @param values - The values to yield.
 * @returns An async iterable that yields each value.
 */
function asyncIterableOf<T>(values: readonly T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      const items = [...values]
      const state = { index: 0 }
      return {
        async next(): Promise<IteratorResult<T>> {
          if (state.index >= items.length) {
            return { done: true, value: undefined }
          }
          const value = items[state.index]
          state.index += 1
          return { done: false, value }
        },
      }
    },
  }
}
