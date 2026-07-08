import type { ComponentType } from 'react'
import { z } from 'zod'

import { stories } from '../../stories/story.js'
import type { StoryGroup } from '../../stories/types.js'
import { StatusMessage } from './status-message.js'

const schema = z.object({
  children: z.string().describe('The message content'),
  variant: z.enum(['info', 'success', 'error', 'warning']).describe('Status variant'),
})

const storyGroup: StoryGroup = stories({
  title: 'StatusMessage',
  component: StatusMessage as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {},
  stories: {
    Info: {
      props: { children: 'Processing data', variant: 'info' },
      description: 'Informational status with circle icon.',
    },
    Success: {
      props: { children: 'Operation completed successfully', variant: 'success' },
      description: 'Success status with tick icon.',
    },
    Error: {
      props: { children: 'Failed to connect', variant: 'error' },
      description: 'Error status with cross icon.',
    },
    Warning: {
      props: { children: 'Config file not found', variant: 'warning' },
      description: 'Warning status with warning icon.',
    },
  },
})

export default storyGroup
