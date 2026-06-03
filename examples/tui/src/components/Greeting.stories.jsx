import { story } from '@maltty/core/stories'
import { z } from 'zod'

import { Greeting } from './Greeting'

const schema = z.object({
  name: z.string().describe('Name to greet'),
  excited: z.boolean().describe('Whether to use an exclamation mark'),
})

export default story({
  name: 'Greeting',
  component: Greeting,
  schema,
  props: {
    name: 'World',
    excited: true,
  },
  description: 'A simple greeting component',
})
