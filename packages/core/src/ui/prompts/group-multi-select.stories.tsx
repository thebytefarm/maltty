import { stories } from '@maltty/core/stories'
import type { StoryGroup } from '@maltty/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { GroupMultiSelect } from './group-multi-select.js'

const schema = z.object({
  required: z.boolean().optional().describe('Require at least one selection'),
  selectableGroups: z.boolean().optional().describe('Allow toggling entire groups'),
  disabled: z.boolean().optional().describe('Disable the component'),
})

const defaultOptions = {
  Fruits: [
    { value: 'apple', label: 'Apple', hint: 'Sweet' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry', disabled: true },
  ],
  Vegetables: [
    { value: 'carrot', label: 'Carrot' },
    { value: 'broccoli', label: 'Broccoli', hint: 'Healthy' },
  ],
}

const storyGroup: StoryGroup = stories({
  title: 'GroupMultiSelect',
  component: GroupMultiSelect as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    options: defaultOptions,
    onChange: (values: readonly unknown[]) => {
      void values
    },
    onSubmit: (values: readonly unknown[]) => {
      void values
    },
  },
  stories: {
    Default: {
      props: {},
      description: 'Basic grouped multi-select with default settings.',
    },
    SelectableGroups: {
      props: { selectableGroups: true },
      description: 'Group headers can be toggled to select/deselect all options.',
    },
    WithRequired: {
      props: { required: true },
      description: 'At least one option must be selected before submitting.',
    },
  },
})

export default storyGroup
