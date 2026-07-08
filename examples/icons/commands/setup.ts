import { command } from 'maltty'
import { match } from 'ts-pattern'

export default command({
  description: 'Interactively install Nerd Fonts',
  handler: async (ctx) => {
    if (ctx.icons.installed()) {
      ctx.log.success('Nerd Fonts are already installed')
      return
    }

    ctx.log.info('Nerd Fonts are not installed on this system')
    const [error, installed] = await ctx.icons.setup()

    if (error) {
      ctx.fail(error.message)
      return
    }

    match(installed)
      .with(true, () => ctx.log.success('Nerd Fonts installed successfully'))
      .with(false, () => ctx.log.info('Installation skipped'))
      .exhaustive()
  },
})
