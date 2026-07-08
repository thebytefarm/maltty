import { command } from 'maltty'
import { z } from 'zod'

import requireAuth from '../middleware/require-auth.js'

const options = z.object({
  name: z.string().describe('Repository name'),
  private: z.boolean().default(false).describe('Create as private repo'),
})

interface CreateRepoInput {
  readonly name: string
  readonly private: boolean
}

interface Repo {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly private: boolean
  readonly owner: string
}

export default command({
  options,
  description: '[auth] Create a new repository',
  middleware: [requireAuth],
  handler: async (ctx) => {
    ctx.status.spinner.start(`Creating repo "${ctx.args.name}"...`)

    const res = await ctx.api.post<Repo, CreateRepoInput>('/repos', {
      body: { name: ctx.args.name, private: ctx.args.private },
    })

    ctx.status.spinner.stop('Repo created')

    ctx.log.success(`Created ${res.data.full_name} (id: ${String(res.data.id)})`)
  },
})
