import { command } from '@maltty/core'
import { z } from 'zod'

const positionals = z.object({
  name: z.enum(['git', 'devops', 'status', 'files']).describe('Icon category to display'),
})

export default command({
  description: 'List all icons in a category',
  positionals,
  handler: (ctx) => {
    const resolved = ctx.icons.category(ctx.args.name)

    ctx.log.raw(
      ctx.format.table(
        Object.entries(resolved).map(([name, glyph]) => ({
          Glyph: glyph,
          Name: name,
        }))
      )
    )
  },
})
