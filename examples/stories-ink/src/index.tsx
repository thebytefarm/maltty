import { story } from '@maltty/stories'
import { Text } from 'ink'
import type { ReactElement } from 'react'
import { z } from 'zod'

interface StatusProps {
  readonly status: 'ready' | 'working'
}

function Status({ status }: StatusProps): ReactElement {
  return <Text>{status}</Text>
}

export default story<StatusProps>({
  name: 'Status',
  component: Status,
  schema: z.object({
    status: z.enum(['ready', 'working']),
  }),
  props: {
    status: 'ready',
  },
})
