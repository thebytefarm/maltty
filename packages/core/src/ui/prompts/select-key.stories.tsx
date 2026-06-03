import { stories } from '@maltty/core/stories'
import type { StoryGroup } from '@maltty/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { SelectKey } from './select-key.js'

const schema = z.object({
  disabled: z.boolean().optional().describe('Disable the component'),
})

const defaultOptions = [
  { value: 'y', label: 'Yes', hint: 'Confirm action' },
  { value: 'n', label: 'No', hint: 'Cancel action' },
  { value: 'a', label: 'Always' },
  { value: 's', label: 'Skip', disabled: true },
]

const storyGroup: StoryGroup = stories({
  title: 'SelectKey',
  component: SelectKey as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    options: defaultOptions,
    onSubmit: (value: unknown) => {
      void value
    },
  },
  stories: {
    Default: {
      props: {},
      description: 'Key-press driven selection with highlighted key characters.',
    },
    Disabled: {
      props: { disabled: true },
      description: 'Select-key in disabled state.',
    },
  },
})

export default storyGroup
