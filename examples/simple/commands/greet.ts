import { command } from '@maltty/core'
import { z } from 'zod'

const options = z.object({
  shout: z.boolean().default(false).describe('Print the greeting in uppercase'),
})

const positionals = z.object({
  name: z.string().describe('Name of the person to greet'),
})

export default command({
  description: 'Greet someone by name',
  options,
  positionals,
  handler: (ctx) => {
    const greeting = `Hello, ${ctx.args.name}!`

    if (ctx.args.shout) {
      ctx.log.raw(greeting.toUpperCase())
    } else {
      ctx.log.raw(greeting)
    }
  },
})
