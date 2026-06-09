import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { attempt } from '@maltty/utils/fp'
import { readManifest } from '@maltty/utils/manifest'
import { command } from 'maltty'
import type { Command, CommandContext } from 'maltty'
import { z } from 'zod'

import { renderTemplate } from '../lib/render.js'
import { readTemplateVersions } from '../lib/template-versions.js'
import type { RenderedFile } from '../lib/types.js'
import { isKebabCase } from '../lib/validate.js'
import { writeFiles } from '../lib/write.js'

const options = z.object({
  config: z.boolean().describe('Include config schema setup').optional(),
  description: z.string().describe('Project description').optional(),
  example: z.boolean().describe('Include example command').optional(),
  name: z.string().describe('Project name (kebab-case)').optional(),
  pm: z.enum(['pnpm', 'yarn', 'npm']).describe('Package manager').optional(),
})

type InitArgs = z.infer<typeof options>

const initCommand: Command = command({
  options,
  description: 'Scaffold a new maltty CLI project',
  handler: async (ctx: CommandContext<InitArgs>) => {
    const projectName = await resolveProjectName(ctx)
    const projectDescription = await resolveDescription(ctx)
    const packageManager = await resolvePackageManager(ctx)
    const includeExample = await resolveIncludeExample(ctx)
    const includeConfig = await resolveIncludeConfig(ctx)

    ctx.status.spinner.start('Scaffolding project...')

    const [versionsError, templateVersions] = readTemplateVersions()
    if (versionsError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(versionsError.message)
    }

    const coreVersion = await resolveDependencyVersion('maltty')
    const cliVersion = await resolveSelfVersion()

    const templateDir = join(import.meta.dirname, '..', 'lib', 'templates', 'project')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: {
        cliVersion,
        coreVersion,
        description: projectDescription,
        includeConfig,
        name: projectName,
        packageManager,
        ...templateVersions,
      },
    })

    if (renderError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const files = selectFiles({ includeConfig, includeExample }, rendered)

    const outputDir = join(process.cwd(), projectName)
    const [writeError] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.status.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.status.spinner.stop('Project created!')

    ctx.log.newline()
    ctx.log.raw('Next steps:')
    ctx.log.raw(`  cd ${projectName}`)
    ctx.log.raw(`  ${packageManager} install`)
  },
})

export default initCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the project name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated project name.
 * @private
 */
async function resolveProjectName(ctx: CommandContext<InitArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Project name must be kebab-case (e.g. my-cli)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Project name',
    placeholder: 'my-cli',
    validate: (value: string | undefined) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. my-cli)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the project description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The project description string.
 * @private
 */
async function resolveDescription(ctx: CommandContext<InitArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: 'A CLI built with maltty',
    message: 'Description',
    placeholder: 'A CLI built with maltty',
  })
}

/**
 * Resolve the package manager from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The selected package manager.
 * @private
 */
async function resolvePackageManager(ctx: CommandContext<InitArgs>): Promise<string> {
  if (ctx.args.pm) {
    return ctx.args.pm
  }
  return ctx.prompts.select({
    message: 'Package manager',
    options: [
      { label: 'pnpm', value: 'pnpm' },
      { label: 'yarn', value: 'yarn' },
      { label: 'npm', value: 'npm' },
    ],
  })
}

/**
 * Resolve whether to include the example command from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the example hello command should be included.
 * @private
 */
async function resolveIncludeExample(ctx: CommandContext<InitArgs>): Promise<boolean> {
  if (ctx.args.example !== undefined) {
    return ctx.args.example
  }
  return ctx.prompts.confirm({
    initialValue: true,
    message: 'Include example command?',
  })
}

/**
 * Resolve whether to include config schema setup from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the config schema file should be included.
 * @private
 */
async function resolveIncludeConfig(ctx: CommandContext<InitArgs>): Promise<boolean> {
  if (ctx.args.config !== undefined) {
    return ctx.args.config
  }
  return ctx.prompts.confirm({
    initialValue: false,
    message: 'Include config schema?',
  })
}

/**
 * Options for filtering the rendered file set.
 *
 * @private
 */
interface SelectFilesOptions {
  readonly includeConfig: boolean
  readonly includeExample: boolean
}

/**
 * Select the rendered files to write, optionally excluding the example command and config.
 *
 * @param options - Flags controlling which optional files to include.
 * @param rendered - The full set of rendered files.
 * @returns The filtered file list.
 * @private
 */
function selectFiles(
  selectionOptions: SelectFilesOptions,
  rendered: readonly RenderedFile[]
): readonly RenderedFile[] {
  return rendered
    .filter(
      (file) => selectionOptions.includeExample || !file.relativePath.includes('commands/hello.ts')
    )
    .filter((file) => selectionOptions.includeConfig || !file.relativePath.includes('config.ts'))
}

const DEFAULT_VERSION = '0.0.0'

/**
 * Resolve the version of the running CLI package.
 *
 * Reads the CLI's own `package.json` by navigating up from the current
 * command file directory. Returns `'0.0.0'` when the manifest cannot be
 * read or is missing a version field.
 *
 * @returns The CLI package version string, or `'0.0.0'` on failure.
 * @private
 */
async function resolveSelfVersion(): Promise<string> {
  const packageDir = join(import.meta.dirname, '..', '..')
  const [error, manifest] = await readManifest(packageDir)
  if (error || !manifest.version) {
    console.warn('Warning: Could not resolve CLI version, using fallback 0.0.0')
    return DEFAULT_VERSION
  }
  return manifest.version
}

/**
 * Resolve the installed version of a dependency package.
 *
 * Uses `createRequire` to locate the package entry point, derives the
 * package root from the resolved path, and reads its `package.json`.
 * Returns `'0.0.0'` when resolution fails for any reason.
 *
 * @param packageName - The npm package name to resolve (e.g. `'maltty'`).
 * @returns The package version string, or `'0.0.0'` on failure.
 * @private
 */
async function resolveDependencyVersion(packageName: string): Promise<string> {
  const require = createRequire(import.meta.url)
  const [resolveError, entryPath] = attempt(() => require.resolve(packageName))
  if (resolveError || entryPath === null) {
    console.warn(`Warning: Could not resolve version for ${packageName}, using fallback 0.0.0`)
    return DEFAULT_VERSION
  }

  const packageDir = join(dirname(entryPath), '..')
  const [manifestError, manifest] = await readManifest(packageDir)
  if (manifestError || !manifest.version) {
    console.warn(`Warning: Could not resolve version for ${packageName}, using fallback 0.0.0`)
    return DEFAULT_VERSION
  }

  return manifest.version
}
