import { command } from '@maltty/core'
import { z } from 'zod'

const positionals = z.object({
  name: z.string().describe('Icon name to look up'),
})

export default command({
  description: 'Show a single icon by name',
  positionals,
  handler: (ctx) => {
    if (!ctx.icons.has(ctx.args.name)) {
      ctx.fail(`Unknown icon: "${ctx.args.name}"`)
    }

    const glyph = ctx.icons.get(ctx.args.name)
    ctx.log.raw(`${glyph}  ${ctx.args.name}`)
  },
})
