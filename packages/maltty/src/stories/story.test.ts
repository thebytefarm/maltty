import { hasTag } from '@maltty/utils/tag'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { stories, story } from './story.js'

function StubComponent(): null {
  return null
}

const testSchema = z.object({
  label: z.string(),
  count: z.number(),
})

describe('story() factory', () => {
  it('should return an object tagged as Story', () => {
    const result = story({
      name: 'basic',
      component: StubComponent,
      schema: testSchema,
      props: { label: 'hello', count: 1 },
    })
    expect(hasTag(result, 'Story')).toBeTruthy()
  })

  it('should preserve name, component, schema, props, and description', () => {
    const result = story({
      name: 'detailed',
      component: StubComponent,
      schema: testSchema,
      props: { label: 'world', count: 42 },
      description: 'A detailed story',
    })
    expect(result.name).toBe('detailed')
    expect(result.component).toBe(StubComponent)
    expect(result.schema).toBe(testSchema)
    expect(result.props).toEqual({ label: 'world', count: 42 })
    expect(result.description).toBe('A detailed story')
  })

  it('should default decorators to an empty frozen array', () => {
    const result = story({
      name: 'no-decorators',
      component: StubComponent,
      schema: testSchema,
      props: { label: '', count: 0 },
    })
    expect(result.decorators).toEqual([])
    expect(Object.isFrozen(result.decorators)).toBeTruthy()
  })

  it('should preserve provided decorators', () => {
    const decorator = (C: typeof StubComponent) => C
    const result = story({
      name: 'with-decorator',
      component: StubComponent,
      schema: testSchema,
      props: { label: '', count: 0 },
      decorators: [decorator],
    })
    expect(result.decorators).toHaveLength(1)
    expect(result.decorators[0]).toBe(decorator)
  })

  it('should return a frozen result', () => {
    const result = story({
      name: 'frozen',
      component: StubComponent,
      schema: testSchema,
      props: { label: '', count: 0 },
    })
    expect(Object.isFrozen(result)).toBeTruthy()
  })

  it('should set description to undefined when omitted', () => {
    const result = story({
      name: 'no-desc',
      component: StubComponent,
      schema: testSchema,
      props: { label: '', count: 0 },
    })
    expect(result.description).toBeUndefined()
  })
})

describe('stories() factory', () => {
  it('should return an object tagged as StoryGroup', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        primary: { props: { label: 'Primary', count: 1 } },
      },
    })
    expect(hasTag(result, 'StoryGroup')).toBeTruthy()
  })

  it('should resolve each variant as a tagged Story', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        primary: { props: { label: 'Primary', count: 1 } },
        secondary: { props: { label: 'Secondary', count: 2 } },
      },
    })
    expect(hasTag(result.stories['primary'], 'Story')).toBeTruthy()
    expect(hasTag(result.stories['secondary'], 'Story')).toBeTruthy()
  })

  it('should set variant names from the record keys', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        primary: { props: { label: 'Primary', count: 1 } },
      },
    })
    expect(result.stories['primary'].name).toBe('primary')
  })

  it('should preserve title, component, and schema', () => {
    const result = stories({
      title: 'Card',
      component: StubComponent,
      schema: testSchema,
      stories: {
        basic: { props: { label: '', count: 0 } },
      },
    })
    expect(result.title).toBe('Card')
    expect(result.component).toBe(StubComponent)
    expect(result.schema).toBe(testSchema)
  })

  it('should default group decorators to an empty frozen array', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        basic: { props: { label: '', count: 0 } },
      },
    })
    expect(result.decorators).toEqual([])
    expect(Object.isFrozen(result.decorators)).toBeTruthy()
  })

  it('should preserve group decorators when provided', () => {
    const decorator = (C: typeof StubComponent) => C
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      decorators: [decorator],
      stories: {
        basic: { props: { label: '', count: 0 } },
      },
    })
    expect(result.decorators).toHaveLength(1)
    expect(result.decorators[0]).toBe(decorator)
  })

  it('should freeze the stories record', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        basic: { props: { label: '', count: 0 } },
      },
    })
    expect(Object.isFrozen(result.stories)).toBeTruthy()
  })

  it('should preserve variant description', () => {
    const result = stories({
      title: 'Button',
      component: StubComponent,
      schema: testSchema,
      stories: {
        described: { props: { label: '', count: 0 }, description: 'A described variant' },
      },
    })
    expect(result.stories['described'].description).toBe('A described variant')
  })
})
