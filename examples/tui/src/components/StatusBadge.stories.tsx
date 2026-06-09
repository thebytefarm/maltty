import { story } from 'maltty/stories'
import { z } from 'zod'

import type { StatusBadgeProps } from './StatusBadge'
import { StatusBadge } from './StatusBadge'

export default story<StatusBadgeProps>({
  name: 'StatusBadge',
  component: StatusBadge,
  schema: z.object({
    status: z.enum(['done', 'in-progress', 'todo']).describe('Current task status'),
  }),
  props: {
    status: 'done',
  },
  description: 'Colored badge showing task status — use the props editor to switch between states',
})
