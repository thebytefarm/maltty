# Icons

The icons system provides Nerd Font glyph resolution with automatic emoji fallback, font detection, interactive installation prompts, and categorized icon definitions for maltty CLIs.

Icons is a sub-export of the `maltty` package (`maltty/icons`), not a separate package. It ships as middleware that decorates `ctx.icons` with methods for resolving icon names to glyphs, checking font availability, and triggering installation.

## Key Concepts

### Nerd Font vs Emoji Fallback

Every icon has two representations: a Nerd Font glyph and an emoji fallback. When the middleware initializes, it detects whether Nerd Fonts are installed on the system. All subsequent `ctx.icons.get()` calls resolve to the appropriate variant automatically.

- **Nerd Fonts detected** -- returns the Nerd Font glyph (e.g. `\uE725` for `branch`)
- **Nerd Fonts not detected** -- returns the emoji fallback (e.g. the twisted arrows emoji for `branch`)

This means commands never need to check font availability themselves. Call `ctx.icons.get('branch')` and the correct character is returned.

### Font Detection

Font detection runs once during middleware initialization and the result is cached for the entire command lifecycle. The detection pipeline works as follows:

1. The middleware scans platform-specific font directories for installed font files (`.ttf`, `.otf`, `.ttc`, `.woff`, `.woff2`).
2. It checks whether any discovered font file path contains the string "Nerd" (case-insensitive).
3. If at least one match is found, Nerd Fonts are considered installed.

Detection is purely filesystem-based -- it scans well-known font directories rather than invoking external tools like `system_profiler` or reading the Windows registry. This keeps the implementation dependency-free and consistent across platforms.

**Platform-specific font directories:**

| Platform    | Directories scanned                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **macOS**   | `~/Library/Fonts`, `/Library/Fonts`, `/System/Library/Fonts`, `/System/Library/Fonts/Supplemental`, `/Network/Library/Fonts` |
| **Linux**   | `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`, `~/.local/share/fonts`                                             |
| **Windows** | `%WINDIR%\Fonts`, `%LOCALAPPDATA%\Microsoft\Windows\Fonts`                                                                   |

Directories that do not exist are silently skipped. If the entire scan fails, the middleware treats Nerd Fonts as not installed and falls back to emoji.

### Icon Categories

Icons are organized into four categories:

| Category | Description                | Examples                                     |
| -------- | -------------------------- | -------------------------------------------- |
| `git`    | Version control operations | `branch`, `commit`, `merge`, `pr`, `tag`     |
| `devops` | Infrastructure and CI/CD   | `deploy`, `docker`, `kubernetes`, `terminal` |
| `status` | Status indicators          | `success`, `error`, `warning`, `pending`     |
| `files`  | File types and filesystem  | `file`, `folder`, `typescript`, `json`       |

### Auto-Setup

When `autoSetup` is enabled, the middleware checks for Nerd Font availability during initialization. If no Nerd Font is detected, it prompts the user to install one before any command handler executes. The auto-setup flow works as follows:

1. Detection runs -- if Nerd Fonts are found, auto-setup is skipped entirely.
2. If no fonts are detected and `autoSetup` is `true`, the install flow begins.
3. If no `font` is specified in options, an interactive picker is displayed so the user can choose a Nerd Font family to install.
4. If a `font` is specified (e.g. `font: 'FiraCode'`), that font is installed directly without prompting.
5. Installation uses the system's package manager or a direct download depending on the platform.
6. On success, subsequent `ctx.icons.get()` calls resolve to Nerd Font glyphs for the remainder of the session.
7. On failure, a warning is logged via `ctx.logger.warn()` and the middleware falls back to emoji -- commands continue to work without interruption.

When `forceSetup` is enabled, the install prompt is shown regardless of whether fonts are already detected. This is useful for switching to a different Nerd Font family.

### Module Augmentation

Importing `maltty/icons` automatically augments the `CommandContext` interface with `readonly icons: IconsContext`. No manual type augmentation or casting is needed -- once the middleware is registered, `ctx.icons` is fully typed in all command handlers.

```ts
// This import triggers the module augmentation:
import { icons } from 'maltty/icons'

// After adding icons() to middleware, ctx.icons is typed automatically:
export default command({
  async handler(ctx) {
    // ctx.icons is IconsContext -- no casting required
    const icon = ctx.icons.get('branch')
  },
})
```

## Adding the Middleware

```ts
import { cli } from 'maltty'
import { icons } from 'maltty/icons'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [icons()],
  commands: `${import.meta.dirname}/commands`,
})
```

### With Configuration

```ts
icons({
  autoSetup: true,
  font: 'FiraCode',
})
```

## IconsOptions

| Option       | Type                             | Default               | Description                                                                 |
| ------------ | -------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `icons`      | `Record<string, IconDefinition>` | Built-in defaults     | Custom icon definitions to merge with defaults                              |
| `autoSetup`  | `boolean`                        | `false`               | Prompt to install Nerd Fonts if not detected                                |
| `font`       | `string`                         | Interactive selection | The Nerd Font family to install (when omitted, shows an interactive picker) |
| `forceSetup` | `boolean`                        | `false`               | Always show the install prompt, even if fonts are detected                  |

## IconsContext

The icons middleware decorates `ctx.icons` with an `IconsContext` object providing methods for icon resolution.

| Method          | Type                                            | Description                                   |
| --------------- | ----------------------------------------------- | --------------------------------------------- |
| `get(name)`     | `(name: string) => string`                      | Resolve an icon name to its glyph string      |
| `has(name)`     | `(name: string) => boolean`                     | Check whether an icon name is defined         |
| `installed()`   | `() => boolean`                                 | Whether Nerd Fonts are detected on the system |
| `setup()`       | `() => AsyncResult<boolean, IconsError>`        | Interactively prompt to install Nerd Fonts    |
| `category(cat)` | `(cat: IconCategory) => Record<string, string>` | Get all resolved icons for a given category   |

### `ctx.icons.get()`

Resolve an icon name to its display string. Returns the Nerd Font glyph when fonts are installed, the emoji fallback otherwise. Returns an empty string when the name is not found.

```ts
export default command({
  async handler(ctx) {
    const icon = ctx.icons.get('branch')
    ctx.log.info(`${icon} Current branch: main`)
  },
})
```

### `ctx.icons.has()`

Check whether an icon name exists in the definitions (built-in or custom).

```ts
if (ctx.icons.has('deploy')) {
  ctx.log.info(`${ctx.icons.get('deploy')} Deploying...`)
}
```

### `ctx.icons.category()`

Retrieve all resolved icons for a category as a record of name-to-glyph mappings.

```ts
const statusIcons = ctx.icons.category('status')
// { success: '...', error: '...', warning: '...', ... }

ctx.log.info(`${statusIcons.success} Build passed`)
ctx.log.error(`${statusIcons.error} Tests failed`)
```

### `ctx.icons.installed()`

Check whether Nerd Fonts are available. When `forceSetup` is enabled, this always returns `false` to allow re-triggering the setup flow.

```ts
if (!ctx.icons.installed()) {
  ctx.log.warn('Nerd Fonts not detected. Icons will use emoji fallback.')
}
```

### `ctx.icons.setup()`

Interactively prompt the user to install Nerd Fonts. Returns a Result tuple with `true` on success or an `IconsError` on failure. On success, subsequent `get()` calls resolve to Nerd Font glyphs.

```ts
if (!ctx.icons.installed()) {
  const [error, result] = await ctx.icons.setup()
  if (error) {
    ctx.log.warn(`Font install failed: ${error.message}`)
  }
}
```

### IconsError

| `type`               | Description                      |
| -------------------- | -------------------------------- |
| `'detection_failed'` | Nerd Font detection check failed |
| `'install_failed'`   | Font installation failed         |

## Custom Icons

Merge custom icon definitions with the built-in defaults by passing an `icons` record. Each entry must provide both a `nerdFont` glyph and an `emoji` fallback.

```ts
icons({
  icons: {
    lambda: { nerdFont: '\uE7A4', emoji: '\u{03BB}' },
    rust: { nerdFont: '\uE7A8', emoji: '\u{1F980}' },
  },
})
```

Custom definitions override built-in icons with the same name. Access them the same way:

```ts
const icon = ctx.icons.get('lambda')
```

### IconDefinition

```ts
interface IconDefinition {
  readonly nerdFont: string
  readonly emoji: string
}
```

## Built-in Icon Reference

The following tables list every built-in icon with its name, Nerd Font glyph codepoint, and emoji fallback.

### Git

| Name       | Nerd Font | Emoji Fallback                      |
| ---------- | --------- | ----------------------------------- |
| `branch`   | `\uE725`  | `\u{1F500}` twisted arrows          |
| `clone`    | `\uF24D`  | `\u{1F4CB}` clipboard               |
| `commit`   | `\uE729`  | `\u{1F4DD}` memo                    |
| `compare`  | `\uE728`  | `\u{1F504}` counterclockwise arrows |
| `fetch`    | `\uEC1D`  | `\u{2B07}\uFE0F` down arrow         |
| `fork`     | `\uF126`  | `\u{1F500}` twisted arrows          |
| `git`      | `\uE702`  | `\u{1F4BB}` laptop                  |
| `merge`    | `\uE727`  | `\u{1F500}` twisted arrows          |
| `pr`       | `\uE726`  | `\u{1F4E5}` inbox tray              |
| `tag`      | `\uF02B`  | `\u{1F3F7}\uFE0F` label             |
| `worktree` | `\uEF81`  | `\u{1F333}` deciduous tree          |

### DevOps

| Name         | Nerd Font | Emoji Fallback                   |
| ------------ | --------- | -------------------------------- |
| `ci`         | `\uF013`  | `\u{2699}\uFE0F` gear            |
| `cloud`      | `\uF0C2`  | `\u{2601}\uFE0F` cloud           |
| `deploy`     | `\uF135`  | `\u{1F680}` rocket               |
| `docker`     | `\uF21F`  | `\u{1F433}` whale                |
| `kubernetes` | `\uE81D`  | `\u{2638}\uFE0F` wheel of dharma |
| `server`     | `\uF233`  | `\u{1F5A5}\uFE0F` desktop        |
| `terminal`   | `\uF120`  | `\u{1F4BB}` laptop               |

### Status

| Name      | Nerd Font | Emoji Fallback               |
| --------- | --------- | ---------------------------- |
| `error`   | `\uF05C`  | `\u{274C}` cross mark        |
| `info`    | `\uF129`  | `\u{2139}\uFE0F` information |
| `pending` | `\uF254`  | `\u{23F3}` hourglass         |
| `running` | `\uF04B`  | `\u{25B6}\uFE0F` play button |
| `stopped` | `\uF28D`  | `\u{23F9}\uFE0F` stop button |
| `success` | `\uF05D`  | `\u{2705}` check mark        |
| `warning` | `\uF071`  | `\u{26A0}\uFE0F` warning     |

### Files

| Name         | Nerd Font | Emoji Fallback             |
| ------------ | --------- | -------------------------- |
| `config`     | `\uF013`  | `\u{2699}\uFE0F` gear      |
| `file`       | `\uF15B`  | `\u{1F4C4}` page facing up |
| `folder`     | `\uF07B`  | `\u{1F4C1}` file folder    |
| `javascript` | `\uE781`  | `\u{1F4C4}` page facing up |
| `json`       | `\uE80B`  | `\u{1F4C4}` page facing up |
| `lock`       | `\uF023`  | `\u{1F512}` locked         |
| `markdown`   | `\uE73E`  | `\u{1F4C4}` page facing up |
| `typescript` | `\uE8CA`  | `\u{1F4C4}` page facing up |

## Usage Patterns

### Using icons in a git status command

```ts
import { command } from 'maltty'

export default command({
  name: 'status',
  description: 'Show repository status',
  async handler(ctx) {
    const branch = ctx.icons.get('branch')
    const commit = ctx.icons.get('commit')

    ctx.logger.info(`${branch} On branch: main`)
    ctx.logger.info(`${commit} Last commit: abc1234`)
  },
})
```

### Using icons with the logger for deployment output

```ts
export default command({
  name: 'deploy',
  description: 'Deploy the application',
  async handler(ctx) {
    const deploy = ctx.icons.get('deploy')
    const success = ctx.icons.get('success')
    const error = ctx.icons.get('error')

    ctx.logger.info(`${deploy} Starting deployment...`)

    const [deployError] = await runDeploy()
    if (deployError) {
      ctx.logger.error(`${error} Deployment failed: ${deployError.message}`)
      return
    }

    ctx.logger.info(`${success} Deployment complete`)
  },
})
```

### Using `category()` to build a legend

```ts
export default command({
  name: 'legend',
  description: 'Show status icon legend',
  async handler(ctx) {
    const statusIcons = ctx.icons.category('status')

    ctx.logger.info('Status icons:')
    ctx.logger.info(`  ${statusIcons.success} success`)
    ctx.logger.info(`  ${statusIcons.error} error`)
    ctx.logger.info(`  ${statusIcons.warning} warning`)
    ctx.logger.info(`  ${statusIcons.pending} pending`)
    ctx.logger.info(`  ${statusIcons.running} running`)
    ctx.logger.info(`  ${statusIcons.stopped} stopped`)
    ctx.logger.info(`  ${statusIcons.info} info`)
  },
})
```

### Checking `installed()` to show setup hints

```ts
export default command({
  name: 'doctor',
  description: 'Check CLI environment',
  async handler(ctx) {
    if (!ctx.icons.installed()) {
      ctx.logger.warn(
        'Nerd Fonts not detected. Run with autoSetup enabled or install a Nerd Font manually.'
      )
      ctx.logger.warn('Visit https://www.nerdfonts.com for installation instructions.')
    }
  },
})
```

## Troubleshooting

### Icons show emoji instead of glyphs

This means Nerd Fonts were not detected on your system. To resolve:

- Enable `autoSetup: true` in the `icons()` middleware options to trigger an interactive install prompt on next run.
- Alternatively, install a Nerd Font manually from [nerdfonts.com](https://www.nerdfonts.com) and restart your terminal.
- Verify the font file is placed in one of the [scanned directories](#font-detection) for your platform.

### Unknown icon name returns an empty string

`ctx.icons.get()` returns an empty string when the name is not found. To resolve:

- Check the name against the [built-in icon reference](#built-in-icon-reference) tables above.
- If using a custom icon, confirm it was passed in the `icons` option of the middleware and that the name matches exactly.
- Use `ctx.icons.has(name)` to verify whether an icon is defined before calling `get()`.

### Auto-setup fails

When the font install fails, a warning is logged and the middleware falls back to emoji. Common causes:

- **Insufficient permissions** -- the install may require elevated privileges depending on the target font directory. Try running with appropriate permissions or install the font manually.
- **Network issues** -- font downloads require internet access. Check connectivity if the install hangs or errors.
- **Unsupported platform** -- if the platform is not macOS, Linux, or Windows, font directory scanning returns no results and auto-setup cannot determine where to install fonts.

## References

- [Core Reference](../reference/maltty.md)
- [Context](./context.md)
- [Lifecycle](./lifecycle.md)
