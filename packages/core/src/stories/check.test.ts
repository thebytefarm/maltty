import { withTag } from '@maltty/utils/tag'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { MAX_EDITABLE_FIELDS, checkStories } from './check.js'
import type { Story, StoryEntry, StoryGroup } from './types.js'

// eslint-disable-next-line vitest/prefer-describe-function-title -- constant, not a function
describe('MAX_EDITABLE_FIELDS', () => {
  it('should equal 6', () => {
    expect(MAX_EDITABLE_FIELDS).toBe(6)
  })
})

describe('checkStories()', () => {
  it('should return empty diagnostics for an empty map', () => {
    const entries = new Map<string, StoryEntry>()
    const result = checkStories(entries)

    expect(result).toEqual({ diagnostics: [], storyCount: 0, passed: true })
  })

  it('should return storyCount 1 and passed true for a single valid story', () => {
    const story = withTag(
      {
        name: 'valid',
        component: () => null,
        schema: z.object({ name: z.string() }),
        props: { name: 'hello' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['valid', story]])
    const result = checkStories(entries)

    expect(result.storyCount).toBe(1)
    expect(result.passed).toBeTruthy()
    expect(result.diagnostics).toHaveLength(0)
  })

  it('should return an error diagnostic when editable fields exceed MAX_EDITABLE_FIELDS', () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string(),
      g: z.string(),
    })

    const story = withTag(
      {
        name: 'too-many',
        component: () => null,
        schema,
        props: { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['too-many', story]])
    const result = checkStories(entries)

    const fieldDiag = result.diagnostics.find((d) => d.message.includes('Too many editable'))
    expect(fieldDiag).toBeDefined()
    expect(fieldDiag?.severity).toBe('error')
  })

  it('should return error diagnostics for prop validation errors', () => {
    const schema = z.object({ count: z.number() })

    const story = withTag(
      {
        name: 'bad-props',
        component: () => null,
        schema,
        props: { count: 'not-a-number' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['bad-props', story]])
    const result = checkStories(entries)

    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1)
    expect(result.diagnostics[0].severity).toBe('error')
    expect(result.diagnostics[0].message).toContain('count')
  })

  it('should count all variants in a story group', () => {
    const schema = z.object({ name: z.string() })

    const variantA = withTag(
      {
        name: 'variant-a',
        component: () => null,
        schema,
        props: { name: 'a' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as Story

    const variantB = withTag(
      {
        name: 'variant-b',
        component: () => null,
        schema,
        props: { name: 'b' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as Story

    const group = withTag(
      {
        title: 'MyGroup',
        component: () => null,
        schema,
        decorators: [],
        stories: { 'variant-a': variantA, 'variant-b': variantB },
      },
      'StoryGroup'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['MyGroup', group]])
    const result = checkStories(entries)

    expect(result.storyCount).toBe(2)
  })

  it('should qualify diagnostic names as "groupTitle / variantName" for story groups', () => {
    const schema = z.object({ count: z.number() })

    const variant = withTag(
      {
        name: 'broken',
        component: () => null,
        schema,
        props: { count: 'oops' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as Story

    const group = withTag(
      {
        title: 'Buttons',
        component: () => null,
        schema,
        decorators: [],
        stories: { broken: variant },
      },
      'StoryGroup'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['Buttons', group]])
    const result = checkStories(entries)

    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1)
    expect(result.diagnostics[0].storyName).toBe('Buttons / broken')
  })

  it('should set passed to false only when error-severity diagnostics exist', () => {
    const okStory = withTag(
      {
        name: 'ok',
        component: () => null,
        schema: z.object({ name: z.string() }),
        props: { name: 'valid' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as StoryEntry

    const entries = new Map<string, StoryEntry>([['ok', okStory]])
    const passingResult = checkStories(entries)
    expect(passingResult.passed).toBeTruthy()

    const schema = z.object({ n: z.number() })
    const badStory = withTag(
      {
        name: 'bad',
        component: () => null,
        schema,
        props: { n: 'wrong' },
        defaultKeys: [] as readonly string[],
        decorators: [],
        description: undefined,
      },
      'Story'
    ) as StoryEntry

    const failEntries = new Map<string, StoryEntry>([['bad', badStory]])
    const failingResult = checkStories(failEntries)
    expect(failingResult.passed).toBeFalsy()
  })

  it('should return a frozen result', () => {
    const entries = new Map<string, StoryEntry>()
    const result = checkStories(entries)

    expect(Object.isFrozen(result)).toBeTruthy()
    expect(Object.isFrozen(result.diagnostics)).toBeTruthy()
  })
})
