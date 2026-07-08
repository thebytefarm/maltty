import { command } from 'maltty'

export default command({
  description: 'Show project status',
  handler: async (ctx) => {
    const { config } = await ctx.config.load({ exitOnError: true })

    const status = {
      cli: {
        name: ctx.meta.name,
        version: ctx.meta.version,
      },
      config: {
        apiUrl: config.apiUrl,
        environment: config.defaultEnvironment,
        org: config.org,
      },
    }

    process.stdout.write(ctx.format.json(status))
  },
})
