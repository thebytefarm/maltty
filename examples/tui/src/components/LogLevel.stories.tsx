import { stories } from 'maltty/stories'
import { z } from 'zod'

import type { LogLevelProps } from './LogLevel'
import { LogLevel } from './LogLevel'

const schema = z.object({
  level: z.enum(['info', 'warn', 'error']).describe('Log severity level'),
})

export default stories<LogLevelProps>({
  title: 'LogLevel',
  component: LogLevel,
  schema,
  stories: {
    Info: {
      props: { level: 'info' },
      description: 'Informational message',
    },
    Warning: {
      props: { level: 'warn' },
      description: 'Warning message',
    },
    Error: {
      props: { level: 'error' },
      description: 'Error message',
    },
  },
})
