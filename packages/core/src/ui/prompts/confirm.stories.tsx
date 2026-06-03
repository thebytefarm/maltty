import { stories } from '@maltty/core/stories'
import type { StoryGroup } from '@maltty/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { Confirm } from './confirm.js'

const schema = z.object({
  active: z.string().describe('Label for the affirmative choice'),
  inactive: z.string().describe('Label for the negative choice'),
  defaultValue: z.boolean().describe('Initial value'),
  disabled: z.boolean().describe('Disable interaction'),
})

const storyGroup: StoryGroup = stories({
  title: 'Confirm',
  component: Confirm as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    onSubmit: (_v: boolean) => {},
  },
  stories: {
    Default: {
      props: { active: 'Yes', inactive: 'No', defaultValue: true, disabled: false },
      description: 'Standard confirm with default labels',
    },
    CustomLabels: {
      props: {
        active: 'Proceed',
        inactive: 'Cancel',
        defaultValue: true,
        disabled: false,
      },
      description: 'Confirm with custom active/inactive labels',
    },
    DefaultNo: {
      props: { active: 'Yes', inactive: 'No', defaultValue: false, disabled: false },
      description: 'Confirm defaulting to the negative choice',
    },
    Disabled: {
      props: { active: 'Yes', inactive: 'No', defaultValue: true, disabled: true },
      description: 'Fully disabled confirm',
    },
  },
})

export default storyGroup
