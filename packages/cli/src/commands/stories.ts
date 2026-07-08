import type { Command } from 'maltty'
import { StoriesScreen } from 'maltty/stories'
import { screen } from 'maltty/ui'
import { z } from 'zod'

/**
 * Options schema for the `maltty stories` command.
 */
const options = z.object({
  include: z.string().describe('Glob pattern for story files').optional(),
  out: z.string().describe('Render story to stdout (pass story name, or omit for all)').optional(),
  check: z.boolean().describe('Validate stories for common issues').default(false),
})

/**
 * Launch the stories viewer TUI for browsing and editing
 * component stories in the terminal.
 */
const storiesCommand: Command = screen({
  description: 'Browse and preview component stories in the terminal',
  options,
  exit: 'manual',
  render: StoriesScreen,
})

export default storiesCommand
