import { command } from '@maltty/core'

export default command({
  description: 'Deploy the application',
  help: { order: ['production', 'preview'] },
})
