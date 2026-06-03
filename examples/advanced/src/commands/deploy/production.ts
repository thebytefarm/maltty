import { command } from '@maltty/core'
import { z } from 'zod'

const options = z.object({
  force: z.boolean().default(false).describe('Skip confirmation prompt'),
  tag: z.string().describe('Release tag to deploy (e.g. v1.2.3)'),
})

export default command({
  options,
  description: 'Deploy to production',
  handler: async (ctx) => {
    const { config } = await ctx.config.load({ exitOnError: true })

    if (!ctx.args.force) {
      const confirmed = await ctx.prompts.confirm({
        message: `Deploy ${ctx.args.tag} to production for ${config.org}?`,
      })

      if (!confirmed) {
        ctx.fail('Deployment cancelled')
      }
    }

    ctx.status.spinner.start(`Deploying ${ctx.args.tag} to production`)
    ctx.status.spinner.message('Running pre-deploy checks')
    ctx.status.spinner.message('Building release artifacts')
    ctx.status.spinner.message('Rolling out to production')
    ctx.status.spinner.stop(`Deployed ${ctx.args.tag} to production`)

    process.stdout.write(
      ctx.format.json({
        environment: 'production',
        org: config.org,
        tag: ctx.args.tag,
        url: `https://${config.org}.acme.dev`,
      })
    )
  },
})
