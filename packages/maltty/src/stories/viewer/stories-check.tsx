import process from 'node:process'

import { useApp } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { match } from 'ts-pattern'

import { useScreenContext } from '../../screen/provider.js'
import { Output } from '../../ui/output.js'
import { checkStories } from '../check.js'
import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'
import { buildIncludePatterns } from './utils.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesCheck} component.
 */
interface StoriesCheckProps {
  readonly include?: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Non-interactive component that discovers stories, validates them,
 * and prints diagnostics using `ctx.status.spinner`, `ctx.log`, and `ctx.report`
 * rendered through `<Output />` before exiting.
 *
 * @param props - The check props.
 * @returns A rendered check element.
 */
export function StoriesCheck({ include }: StoriesCheckProps): ReactElement {
  const ctx = useScreenContext()
  const { exit } = useApp()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }
    started.current = true

    const [importerError, importer] = createStoryImporter()

    if (importerError) {
      process.exitCode = 1
      ctx.log.error(importerError.message)
      exit()
      return
    }

    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    ctx.status.spinner.start('Discovering stories...')

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      if (result.entries.size === 0) {
        ctx.status.spinner.stop('Discovery complete')
        ctx.log.warn('No stories found.')
        exit()
        return
      }

      ctx.status.spinner.stop(
        `Discovered ${String(result.entries.size)} story file${match(result.entries.size !== 1)
          .with(true, () => 's')
          .with(false, () => '')
          .exhaustive()}`
      )

      const checkResult = checkStories(result.entries)

      if ('report' in ctx) {
        checkResult.diagnostics.map((d) =>
          ctx.report.check({
            status: match(d.severity)
              .with('error', () => 'fail' as const)
              .with('warning', () => 'warn' as const)
              .exhaustive(),
            name: d.storyName,
            detail: d.message,
          })
        )

        const errors = checkResult.diagnostics.filter((d) => d.severity === 'error')
        const warnings = checkResult.diagnostics.filter((d) => d.severity === 'warning')

        ctx.report.summary({
          style: 'tally',
          stats: [
            { label: 'Stories', value: String(checkResult.storyCount) },
            { label: 'Errors', value: String(errors.length) },
            { label: 'Warnings', value: String(warnings.length) },
          ],
        })
      }

      match(checkResult.passed)
        .with(true, () => {
          ctx.log.success('All stories passed validation')
        })
        .with(false, () => {
          process.exitCode = 1
          ctx.log.error('Story validation failed')
        })
        .exhaustive()

      exit()
    }

    run().catch((error: unknown) => {
      ctx.status.spinner.stop('Discovery failed')
      const message = match(error instanceof Error)
        .with(true, () => (error as Error).message)
        .with(false, () => 'Unknown error during discovery')
        .exhaustive()
      process.exitCode = 1
      ctx.log.error(message)
      exit()
    })
  }, [include, ctx, exit])

  return <Output />
}
