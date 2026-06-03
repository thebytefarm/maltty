import { stories } from '@maltty/core/stories'
import type { StoryGroup } from '@maltty/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { Select } from './select.js'

const schema = z.object({
  maxVisible: z.number().describe('Max visible options'),
  disabled: z.boolean().describe('Disable interaction'),
})

const storyGroup: StoryGroup = stories({
  title: 'Select',
  component: Select as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    options: [
      { value: 'next', label: 'Next.js', hint: 'React framework' },
      { value: 'remix', label: 'Remix' },
      { value: 'astro', label: 'Astro', hint: 'Content-focused' },
      { value: 'nuxt', label: 'Nuxt', disabled: true },
    ],
    onSubmit: (_v: string) => {},
  },
  stories: {
    Default: {
      props: { maxVisible: 5, disabled: false },
      description: 'Standard select with default settings',
    },
    WithHints: {
      props: {
        maxVisible: 5,
        disabled: false,
        options: [
          { value: 'ts', label: 'TypeScript', hint: 'Strongly typed' },
          { value: 'js', label: 'JavaScript', hint: 'Dynamic typing' },
          { value: 'rs', label: 'Rust', hint: 'Systems language' },
          { value: 'go', label: 'Go', hint: 'Concurrency built-in' },
        ],
      },
      description: 'All options with hint text',
    },
    DisabledOptions: {
      props: {
        maxVisible: 5,
        disabled: false,
        options: [
          { value: 'a', label: 'Available' },
          { value: 'b', label: 'Blocked', disabled: true },
          { value: 'c', label: 'Also available' },
          { value: 'd', label: 'Also blocked', disabled: true },
        ],
      },
      description: 'Mix of enabled and disabled options',
    },
    Scrolling: {
      props: {
        maxVisible: 3,
        disabled: false,
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
          { value: '3', label: 'Option 3' },
          { value: '4', label: 'Option 4' },
          { value: '5', label: 'Option 5' },
          { value: '6', label: 'Option 6' },
        ],
      },
      description: 'Scrollable list with maxVisible=3',
    },
    Disabled: {
      props: { maxVisible: 5, disabled: true },
      description: 'Fully disabled select',
    },
  },
})

export default storyGroup
