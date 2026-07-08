import { command } from 'maltty'

export default command({
  description: 'Log out of the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.logout()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.log.success('Logged out')
  },
})
