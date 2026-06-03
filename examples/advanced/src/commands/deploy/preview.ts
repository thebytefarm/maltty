import { command } from '@maltty/core'
import { z } from 'zod'

const options = z.object({
  clean: z.boolean().default(false).describe('Clean build before deploying'),
})

const positionals = z.object({
  branch: z.string().default('main').describe('Branch to deploy'),
})

export default command({
  options,
  positionals,
  description: 'Deploy a preview environment',
  handler: async (ctx) => {
    const { config } = await ctx.config.load({ exitOnError: true })

    ctx.status.spinner.start(`Deploying preview from ${ctx.args.branch}`)

    if (ctx.args.clean) {
      ctx.status.spinner.message('Running clean build')
    }

    ctx.status.spinner.message('Uploading artifacts')
    ctx.status.spinner.message('Provisioning environment')

    const deployUrl = `https://preview-${ctx.args.branch}.${config.org}.acme.dev`

    ctx.status.spinner.stop('Preview deployed')

    process.stdout.write(
      ctx.format.json({
        branch: ctx.args.branch,
        environment: 'preview',
        org: config.org,
        url: deployUrl,
      })
    )
  },
})
