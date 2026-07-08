import { stories } from 'maltty/stories'
import type { StoryGroup } from 'maltty/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { Autocomplete } from './autocomplete.js'

const schema = z.object({
  placeholder: z.string().optional().describe('Placeholder text for the search input'),
  maxVisible: z.number().optional().describe('Maximum visible options'),
  disabled: z.boolean().optional().describe('Disable the component'),
})

const defaultOptions = [
  { value: 'react', label: 'React', hint: 'UI library' },
  { value: 'vue', label: 'Vue', hint: 'Progressive framework' },
  { value: 'angular', label: 'Angular', hint: 'Platform' },
  { value: 'svelte', label: 'Svelte', hint: 'Compiler' },
  { value: 'solid', label: 'SolidJS' },
  { value: 'preact', label: 'Preact', hint: 'Lightweight' },
  { value: 'lit', label: 'Lit', hint: 'Web components' },
  { value: 'htmx', label: 'HTMX', disabled: true },
]

const storyGroup: StoryGroup = stories({
  title: 'Autocomplete',
  component: Autocomplete as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    options: defaultOptions,
    onChange: (value: unknown) => {
      void value
    },
    onSubmit: (value: unknown) => {
      void value
    },
  },
  stories: {
    Default: {
      props: { placeholder: 'Search frameworks...' },
      description: 'Default autocomplete with placeholder text.',
    },
    CustomFilter: {
      props: {
        placeholder: 'Type to search...',
        filter: (search: string, option: { readonly label: string }) =>
          option.label.toLowerCase().startsWith(search.toLowerCase()),
      },
      description: 'Autocomplete with a custom starts-with filter.',
    },
    Disabled: {
      props: { disabled: true },
      description: 'Autocomplete in disabled state.',
    },
  },
})

export default storyGroup
