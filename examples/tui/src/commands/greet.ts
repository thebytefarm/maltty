import { command } from 'maltty'
import { match } from 'ts-pattern'
import { z } from 'zod'

const options = z.object({
  shout: z.boolean().default(false).describe('Print in uppercase'),
})

const positionals = z.object({
  name: z.string().describe('Name of the person to greet'),
})

export default command({
  description: 'Greet someone by name (imperative handler)',
  options,
  positionals,
  handler: (ctx) => {
    const greeting = `Hello, ${ctx.args.name}!`

    match(ctx.args.shout)
      .with(true, () => ctx.log.raw(greeting.toUpperCase()))
      .with(false, () => ctx.log.raw(greeting))
      .exhaustive()
  },
})
