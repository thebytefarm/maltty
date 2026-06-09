import { command } from 'maltty'

export default command({
  description: 'Deploy the application',
  help: { order: ['production', 'preview'] },
})
