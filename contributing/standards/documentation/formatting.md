# Documentation Formatting Standards

## Overview

Standards for code examples, tables, code blocks, and markdown formatting. Consistent formatting makes documentation scannable and reduces cognitive load. These rules apply to all markdown files in the repository.

## Rules

### Keep Code Examples Minimal

Show only the critical parts. Omit imports, boilerplate, and obvious code.

#### Correct

This example is focused on the API.

```ts
const config = await loadConfig('maltty')
const scripts = discoverScripts(config)
```

#### Incorrect

This example is too noisy and the reader is distracted by the boilerplate and obvious code.

```ts
import { loadConfig } from './lib/config'
import { discoverScripts } from './lib/discovery'
import { createRunner } from './runtime/runner'
import { createContext } from './runtime/context'
import { log } from '@clack/prompts'

async function main() {
  const config = await loadConfig('maltty')
  const scripts = discoverScripts(config)
  const runner = createRunner(config)
  const context = createContext({ cwd: process.cwd() })

  for (const script of scripts) {
    const result = await runner.execute(script, context)
    log.info(`Completed: ${result.name}`)
  }
}

main()
```

### Use Full Examples for Copy-Paste Templates

When the reader should copy the entire block, show everything including imports and full structure.

#### Correct

```ts
// Full file template - reader copies this
import { cli, z } from '@maltty/core'

export default cli({
  description: 'Generate types from the API schema',
  args: {
    output: z.string().default('src/generated'),
    watch: z.boolean().default(false),
  },
  async run(ctx) {
    ctx.log.info(`Generating types to ${ctx.args.output}`)
  },
})
```

### Follow Code Example Rules

- No inline comments unless explaining non-obvious logic
- No `// ...` or placeholder code
- Use real values, not `foo`/`bar`/`example`
- Show imports only when they are the point of the example

### Use Tables for Structured Information

Use tables when presenting structured data with consistent columns.

#### Correct

| Item   | Description |
| ------ | ----------- |
| First  | Description |
| Second | Description |

### Specify Language in Code Blocks

Always specify the language for syntax highlighting.

#### Correct

```ts
const example = 'typescript'
```

```bash
pnpm build
```

#### Incorrect

```
const example = 'no highlighting'
```

### Use Correct Link Styles

- Use relative links for internal docs: `[Auth](../authentication.md)`
- Use full URLs for external docs: `[Zod](https://zod.dev)`

## References

- [Writing Standards](./writing.md)
- [Diagram Standards](./diagrams.md)
