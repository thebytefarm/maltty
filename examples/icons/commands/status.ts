import { command } from '@maltty/core'

export default command({
  description: 'Show Nerd Font detection status and all icons',
  handler: (ctx) => {
    if (ctx.icons.installed()) {
      ctx.log.success('Nerd Fonts detected - showing Nerd Font glyphs')
    } else {
      ctx.log.warn('Nerd Fonts not detected - showing emoji fallbacks')
    }

    const categories = [
      { label: 'Git icons:', name: 'git' as const },
      { label: 'Status icons:', name: 'status' as const },
      { label: 'DevOps icons:', name: 'devops' as const },
      { label: 'File icons:', name: 'files' as const },
    ]

    const _logged = categories.map(({ label, name }) => {
      ctx.log.info('')
      ctx.log.info(label)
      const icons = ctx.icons.category(name)
      return Object.entries(icons).map(([iconName, glyph]) =>
        ctx.log.info(`  ${glyph}  ${iconName}`)
      )
    })
  },
})
