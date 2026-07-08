import { join } from 'node:path'

import { loadConfig } from '@maltty/config/utils'
import type { LoadConfigResult } from '@maltty/config/utils'
import { command } from 'maltty'
import type { Command, CommandContext } from 'maltty'
import { z } from 'zod'

import { detectProject } from '../../lib/detect.js'
import { renderTemplate } from '../../lib/render.js'
import { isKebabCase } from '../../lib/validate.js'
import { writeFiles } from '../../lib/write.js'

const options = z.object({
  args: z.boolean().describe('Include args schema').optional(),
  description: z.string().describe('Command description').optional(),
  name: z.string().describe('Command name (kebab-case)').optional(),
})

type AddCommandArgs = z.infer<typeof options>

const addCommandCommand: Command = command({
  options,
  description: 'Add a new command to your project',
  handler: async (ctx: CommandContext<AddCommandArgs>) => {
    const cwd = process.cwd()

    const [detectError, project] = await detectProject(cwd)
    if (detectError) {
      return ctx.fail(detectError.message)
    }
    if (!project) {
      return ctx.fail('Not in a maltty project. Run `maltty init` first.')
    }

    const [, configResult] = await loadConfig({ cwd: project.rootDir })

    const commandName = await resolveCommandName(ctx)
    const commandDescription = await resolveDescription(ctx)
    const includeArgs = await resolveIncludeArgs(ctx)

    ctx.status.spinner.start('Generating command...')

    const templateDir = join(import.meta.dirname, '..', '..', 'lib', 'templates', 'command')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { commandName, description: commandDescription, includeArgs },
    })

    if (renderError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const outputDir = resolveCommandsDir(configResult, project.rootDir)
    const files = rendered.map((file) => ({
      content: file.content,
      relativePath: file.relativePath.replace('command.ts', `${commandName}.ts`),
    }))

    const [writeError, result] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.status.spinner.stop('Command created!')

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

export default addCommandCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the command name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated command name.
 * @private
 */
async function resolveCommandName(ctx: CommandContext<AddCommandArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Command name must be kebab-case (e.g. deploy)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Command name',
    placeholder: 'deploy',
    validate: (value: string | undefined) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. deploy)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the command description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The command description string.
 * @private
 */
async function resolveDescription(ctx: CommandContext<AddCommandArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: '',
    message: 'Description',
    placeholder: 'What does this command do?',
  })
}

/**
 * Resolve whether to include args from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the command should include a zod args schema.
 * @private
 */
async function resolveIncludeArgs(ctx: CommandContext<AddCommandArgs>): Promise<boolean> {
  if (ctx.args.args !== undefined) {
    return ctx.args.args
  }
  return ctx.prompts.confirm({
    initialValue: true,
    message: 'Include args schema?',
  })
}

/**
 * Resolve the commands output directory from the maltty config.
 *
 * Uses the `commands` field from `maltty.config.ts` when available,
 * falling back to the maltty default of `'commands'`.
 *
 * @param configResult - The loaded config result, or null when loading failed.
 * @param rootDir - The project root directory.
 * @returns The absolute path to the commands directory.
 * @private
 */
function resolveCommandsDir(configResult: LoadConfigResult | null, rootDir: string): string {
  const DEFAULT_COMMANDS = 'commands'

  if (configResult) {
    return join(rootDir, configResult.config.commands ?? DEFAULT_COMMANDS)
  }

  return join(rootDir, DEFAULT_COMMANDS)
}
