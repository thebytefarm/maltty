import type { ComponentType } from 'react'
import { z } from 'zod'

import { stories } from '../../stories/story.js'
import type { StoryGroup } from '../../stories/types.js'
import { ProgressBar } from './progress-bar.js'

const schema = z.object({
  value: z.number().describe('Current progress value'),
  max: z.number().optional().describe('Maximum value'),
  label: z.string().optional().describe('Label displayed after the percentage'),
  style: z.enum(['light', 'heavy', 'block']).optional().describe('Visual style of the bar'),
  size: z.number().optional().describe('Width of the bar in characters'),
})

const storyGroup: StoryGroup = stories({
  title: 'ProgressBar',
  component: ProgressBar as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {},
  stories: {
    Empty: {
      props: { value: 0 },
      description: 'Empty progress bar at 0%.',
    },
    Half: {
      props: { value: 50 },
      description: 'Progress bar at 50%.',
    },
    Full: {
      props: { value: 100 },
      description: 'Completed progress bar at 100%.',
    },
    WithLabel: {
      props: { value: 65, label: 'Installing dependencies' },
      description: 'Progress bar with a descriptive label.',
    },
    StyleVariants: {
      props: { value: 40, style: 'heavy', size: 30 },
      description: 'Heavy style progress bar with custom width.',
    },
  },
})

export default storyGroup
