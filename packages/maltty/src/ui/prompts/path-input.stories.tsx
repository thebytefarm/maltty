import { stories } from 'maltty/stories'
import type { StoryGroup } from 'maltty/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { PathInput } from './path-input.js'

const schema = z.object({
  root: z.string().optional().describe('Root directory for completions'),
  directoryOnly: z.boolean().optional().describe('Only suggest directories'),
  defaultValue: z.string().optional().describe('Initial input value'),
  disabled: z.boolean().optional().describe('Disable the component'),
})

const storyGroup: StoryGroup = stories({
  title: 'PathInput',
  component: PathInput as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    onChange: (value: unknown) => {
      void value
    },
    onSubmit: (value: unknown) => {
      void value
    },
  },
  stories: {
    Default: {
      props: { root: process.cwd() },
      description: 'Default path input with tab-completion from the current directory.',
    },
    DirectoryOnly: {
      props: { root: process.cwd(), directoryOnly: true },
      description: 'Path input that only suggests and accepts directories.',
    },
    WithValidation: {
      props: {
        root: process.cwd(),
        validate: (value: string) => {
          if (value === '') {
            return 'Path is required.'
          }
          return undefined
        },
      },
      description: 'Path input with validation that requires a non-empty value.',
    },
  },
})

export default storyGroup
