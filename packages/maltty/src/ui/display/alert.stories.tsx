import type { ComponentType } from 'react'
import { z } from 'zod'

import { stories } from '../../stories/story.js'
import type { StoryGroup } from '../../stories/types.js'
import { Alert } from './alert.js'

const schema = z.object({
  children: z.string().describe('The content to display inside the alert box'),
  variant: z.enum(['info', 'success', 'error', 'warning']).describe('Alert variant'),
  title: z.string().optional().describe('Title rendered in the top border'),
  rounded: z.boolean().optional().describe('Use rounded border corners'),
  contentAlign: z
    .enum(['left', 'center', 'right'])
    .optional()
    .describe('Horizontal alignment of content'),
  titleAlign: z
    .enum(['left', 'center', 'right'])
    .optional()
    .describe('Horizontal alignment of title'),
})

const storyGroup: StoryGroup = stories({
  title: 'Alert',
  component: Alert as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {},
  stories: {
    Info: {
      props: { children: 'This is an informational message.', variant: 'info' },
      description: 'Info variant alert with blue border.',
    },
    Success: {
      props: { children: 'Operation completed successfully.', variant: 'success' },
      description: 'Success variant alert with green border.',
    },
    Error: {
      props: { children: 'Something went wrong.', variant: 'error' },
      description: 'Error variant alert with red border.',
    },
    Warning: {
      props: { children: 'Config file not found.', variant: 'warning' },
      description: 'Warning variant alert with yellow border.',
    },
    WithTitle: {
      props: {
        children: 'Please check your configuration.',
        variant: 'warning',
        title: 'Warning',
      },
      description: 'Alert with a title rendered in the top border.',
    },
  },
})

export default storyGroup
