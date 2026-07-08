import { command } from 'maltty'

export default command({
  description: 'Initialize a new project interactively',
  handler: async (ctx) => {
    const name = await ctx.prompts.text({
      message: 'Project name',
      placeholder: 'my-project',
    })

    const template = await ctx.prompts.select({
      message: 'Template',
      options: [
        { hint: 'bare bones setup', label: 'Minimal', value: 'minimal' },
        { hint: 'common defaults', label: 'Standard', value: 'standard' },
        { hint: 'all features enabled', label: 'Full', value: 'full' },
      ],
    })

    const features = await ctx.prompts.multiselect({
      message: 'Features',
      options: [
        { label: 'Authentication', value: 'auth' },
        { label: 'Database', value: 'db' },
        { label: 'CI/CD', value: 'ci' },
      ],
    })

    const confirmed = await ctx.prompts.confirm({
      message: `Create "${name}" with ${template} template?`,
    })

    if (!confirmed) {
      ctx.fail('Project creation cancelled')
    }

    ctx.status.spinner.start(`Scaffolding ${name}`)

    ctx.log.info(`Template: ${template}`)
    ctx.log.info(`Features: ${features.join(', ')}`)

    ctx.status.spinner.stop(`Created ${name}`)
  },
})
