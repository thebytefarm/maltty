import { join } from 'node:path'

import { command } from 'maltty'
import type { Command, CommandContext } from 'maltty'
import { z } from 'zod'

import { detectProject } from '../../lib/detect.js'
import { renderTemplate } from '../../lib/render.js'
import { isKebabCase } from '../../lib/validate.js'
import { writeFiles } from '../../lib/write.js'

const options = z.object({
  description: z.string().describe('Middleware description').optional(),
  name: z.string().describe('Middleware name (kebab-case)').optional(),
})

type AddMiddlewareArgs = z.infer<typeof options>

const addMiddlewareCommand: Command = command({
  options,
  description: 'Add a new middleware to your project',
  handler: async (ctx: CommandContext<AddMiddlewareArgs>) => {
    const [detectError, project] = await detectProject(process.cwd())
    if (detectError) {
      return ctx.fail(detectError.message)
    }
    if (!project) {
      return ctx.fail('Not in a maltty project. Run `maltty init` first.')
    }

    const middlewareName = await resolveMiddlewareName(ctx)
    const middlewareDescription = await resolveDescription(ctx)

    ctx.status.spinner.start('Generating middleware...')

    const templateDir = join(import.meta.dirname, '..', '..', 'lib', 'templates', 'middleware')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { description: middlewareDescription, middlewareName },
    })

    if (renderError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const outputDir = join(project.rootDir, 'src', 'middleware')
    const files = rendered.map((file) => ({
      content: file.content,
      relativePath: file.relativePath.replace('middleware.ts', `${middlewareName}.ts`),
    }))

    const [writeError, result] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.status.spinner.stop('Middleware created!')

    const lines = [
      ...result.written.map((file) => `  created ${file}`),
      ...result.skipped.map((file) => `  skipped ${file} (already exists)`),
    ]
    const summary = lines.join('\n')
    if (summary.length > 0) {
      ctx.log.raw(summary)
    }
  },
})

export default addMiddlewareCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the middleware name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated middleware name.
 * @private
 */
async function resolveMiddlewareName(ctx: CommandContext<AddMiddlewareArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Middleware name must be kebab-case (e.g. auth)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Middleware name',
    placeholder: 'auth',
    validate: (value: string | undefined) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. auth)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the middleware description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The middleware description string.
 * @private
 */
async function resolveDescription(ctx: CommandContext<AddMiddlewareArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: '',
    message: 'Description',
    placeholder: 'What does this middleware do?',
  })
}
