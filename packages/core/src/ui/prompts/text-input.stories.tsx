import { stories } from '@maltty/core/stories'
import type { StoryGroup } from '@maltty/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { TextInput } from './text-input.js'

const schema = z.object({
  placeholder: z.string().describe('Placeholder text'),
  defaultValue: z.string().describe('Initial value'),
  disabled: z.boolean().describe('Disable interaction'),
})

const storyGroup: StoryGroup = stories({
  title: 'TextInput',
  component: TextInput as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    onSubmit: (_v: string) => {},
  },
  stories: {
    Default: {
      props: { placeholder: '', defaultValue: '', disabled: false },
      description: 'Empty text input with no placeholder',
    },
    WithPlaceholder: {
      props: { placeholder: 'Enter your name...', defaultValue: '', disabled: false },
      description: 'Text input with placeholder text',
    },
    WithValidation: {
      props: {
        placeholder: 'Enter at least 3 characters...',
        defaultValue: '',
        disabled: false,
        validate: (value: string) => {
          if (value.length < 3) {
            return 'Must be at least 3 characters'
          }
          return undefined
        },
      },
      description: 'Text input with minimum length validation',
    },
    Disabled: {
      props: { placeholder: 'Disabled input', defaultValue: '', disabled: true },
      description: 'Fully disabled text input',
    },
  },
})

export default storyGroup
