import { command } from 'maltty'
import type { Command } from 'maltty'

const addCommand: Command = command({
  description: 'Add a command, middleware, or config to your project',
})

export default addCommand
