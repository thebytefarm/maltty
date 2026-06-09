import { command } from 'maltty'

export default command({
  description: 'Check API connectivity',
  handler: async (ctx) => {
    ctx.status.spinner.start('Pinging API...')
    try {
      const res = await ctx.api.get('/health')
      ctx.status.spinner.stop('API reachable')
      process.stdout.write(ctx.format.json(res.data))
    } catch {
      ctx.status.spinner.stop('API unreachable')
      ctx.fail('Could not connect to the API')
    }
  },
})
