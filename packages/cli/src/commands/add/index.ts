import { command } from '@maltty/core'
import type { Command } from '@maltty/core'

const addCommand: Command = command({
  description: 'Add a command, middleware, or config to your project',
})

export default addCommand
