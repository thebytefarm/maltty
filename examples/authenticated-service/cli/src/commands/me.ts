import { command } from 'maltty'
import { z } from 'zod'

import requireAuth from '../middleware/require-auth.js'

const options = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

interface User {
  readonly login: string
  readonly id: number
  readonly name: string
  readonly email: string
}

export default command({
  options,
  description: '[auth] Display the authenticated user',
  middleware: [requireAuth],
  handler: async (ctx) => {
    ctx.status.spinner.start('Fetching user...')

    const res = await ctx.api.get<User>('/user')

    ctx.status.spinner.stop('User fetched')

    if (ctx.args.json) {
      process.stdout.write(ctx.format.json(res.data))
      return
    }

    ctx.log.info(`Login: ${res.data.login}`)
    ctx.log.info(`Name:  ${res.data.name}`)
    ctx.log.info(`Email: ${res.data.email}`)
  },
})
