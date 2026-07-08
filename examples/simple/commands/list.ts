import { command } from 'maltty'
import { match } from 'ts-pattern'
import { z } from 'zod'

const options = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
  status: z.enum(['all', 'active', 'done']).default('all').describe('Filter tasks by status'),
})

const TASKS = [
  { id: 1, status: 'done', title: 'Set up CI pipeline' },
  { id: 2, status: 'active', title: 'Write integration tests' },
  { id: 3, status: 'active', title: 'Deploy to staging' },
  { id: 4, status: 'done', title: 'Update README' },
  { id: 5, status: 'active', title: 'Review security audit' },
] as const

export default command({
  options,
  description: 'List all tasks',
  handler: (ctx) => {
    const filtered = TASKS.filter(
      (task) => ctx.args.status === 'all' || task.status === ctx.args.status
    )

    const mapped = filtered.map((task) => ({
      ID: task.id,
      Status: task.status,
      Title: task.title,
    }))

    match(ctx.args.json)
      .with(true, () => process.stdout.write(ctx.format.json(mapped)))
      .otherwise(() => process.stdout.write(ctx.format.table(mapped)))
  },
})
