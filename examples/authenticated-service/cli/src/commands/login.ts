import { command } from '@maltty/core'

export default command({
  description: 'Authenticate with the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.login()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.log.success('Logged in')
  },
})
