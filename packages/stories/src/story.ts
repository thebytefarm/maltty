import { withTag } from '@maltty/utils/tag'
import type { ComponentType } from 'react'

import type { StoriesGroupDef, Story, StoryDef, StoryGroup } from './types.js'

/**
 * Define a single story for a component.
 *
 * Wraps the provided definition in a frozen, tagged object that the story
 * registry and viewer can consume at runtime.
 *
 * @param def - The story definition including component, schema, and default props.
 * @returns A frozen {@link Story} tagged with `'Story'`.
 */
export function story<TProps extends object>(def: StoryDef<TProps>): Story<TProps> {
  const tagged = withTag(
    {
      name: def.name,
      component: def.component,
      schema: def.schema,
      props: def.props,
      defaultKeys: [] as readonly string[],
      decorators: Object.freeze(def.decorators ?? []),
      description: def.description,
    },
    'Story'
  )
  return Object.freeze(tagged) as Story<TProps>
}

/**
 * Define a group of related stories for a single component.
 *
 * Each variant shares the same component and schema but provides its own props
 * and optional decorators. The group itself can also carry shared decorators.
 *
 * @param def - The group definition including title, component, schema, and variant map.
 * @returns A frozen {@link StoryGroup} tagged with `'StoryGroup'`.
 */
export function stories<TProps extends object>(def: StoriesGroupDef<TProps>): StoryGroup {
  const groupDecorators = Object.freeze(def.decorators ?? [])
  const defaults = def.defaults ?? ({} as Partial<Record<string, unknown>>)
  const defaultKeys = Object.keys(defaults) as readonly string[]

  const resolvedStories = Object.freeze(
    Object.fromEntries(
      Object.entries(def.stories).map(([variantName, variant]) => [
        variantName,
        Object.freeze(
          withTag(
            {
              name: variantName,
              component: def.component as ComponentType<Record<string, unknown>>,
              schema: def.schema,
              props: { ...defaults, ...variant.props } as Record<string, unknown>,
              defaultKeys,
              decorators: Object.freeze(variant.decorators ?? []),
              description: variant.description,
            },
            'Story'
          )
        ),
      ])
    )
  ) as Readonly<Record<string, Story>>

  const tagged = withTag(
    {
      title: def.title,
      component: def.component as ComponentType<Record<string, unknown>>,
      schema: def.schema,
      decorators: groupDecorators,
      stories: resolvedStories,
    },
    'StoryGroup'
  )
  return Object.freeze(tagged) as StoryGroup
}
