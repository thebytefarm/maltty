import { stories } from '@maltty/stories'
import type { StoryGroup } from '@maltty/stories'
import { Spinner } from '@maltty/tui/spinner'
import type { ComponentType } from 'react'
import { z } from 'zod'

const schema = z.object({
  label: z.string().optional().describe('Text label displayed next to the spinner'),
  isActive: z.boolean().optional().describe('Whether the spinner animates'),
  type: z.string().optional().describe('The cli-spinners spinner type'),
})

const storyGroup: StoryGroup = stories({
  title: 'Spinner',
  component: Spinner as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {},
  stories: {
    Default: {
      props: { label: 'Loading...' },
      description: 'Default dots spinner with a label.',
    },
    CustomType: {
      props: { label: 'Processing...', type: 'line' },
      description: 'Spinner using the line animation type.',
    },
    Inactive: {
      props: { label: 'Paused', isActive: false },
      description: 'Inactive spinner renders nothing.',
    },
  },
})

export default storyGroup
