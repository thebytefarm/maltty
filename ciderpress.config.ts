import { BUILT_IN_THEMES, defineTheme } from '@ciderpress/theme'
import { defineConfig } from 'ciderpress/config'

// ─────────────────────────────────────────────────────────────────────────────
//  Custom maltty theme, built on midnight's dark variant.
//  Overrides every brand token slot with the maltty palette via `defineTheme`.
//  Emits the full token tree as CSS at build time (rc.3+ feature).
//  Inherits terminal, syntax, tint, and scrollbar tokens from midnight.
// ─────────────────────────────────────────────────────────────────────────────

const midnightDark = BUILT_IN_THEMES.midnight.variants.dark

const malttyTheme = defineTheme({
  name: 'maltty',
  defaultVariant: 'dark',
  variants: {
    dark: {
      ...midnightDark,
      colors: {
        ...midnightDark.colors,
        brand: {
          primary: '#CF9E36',
          hover: '#E4BC5C',
          active: '#A57B26',
          fg: '#0E0E10',
          soft: 'rgba(207, 158, 54, 0.16)',
          onBrand: '#0E0E10',
          light: '#E4BC5C',
          lighter: '#F3DC9A',
        },
        surface: {
          ...midnightDark.colors.surface,
          bg: '#0E0E10',
          bgAlt: '#15151A',
          bgElv: '#1C1C22',
          bgSoft: '#0A0A0C',
          homeBg: '#0A0A0C',
        },
        text: {
          ...midnightDark.colors.text,
          text1: '#F1ECDC',
          text2: '#B8B2A0',
          text3: '#7A7568',
        },
        border: {
          ...midnightDark.colors.border,
          border: 'rgba(207, 158, 54, 0.14)',
          divider: 'rgba(207, 158, 54, 0.08)',
        },
        button: {
          ...midnightDark.colors.button,
          brand: {
            bg: '#CF9E36',
            hoverBg: '#E4BC5C',
            activeBg: '#A57B26',
            text: '#0E0E10',
          },
        },
      },
    },
  },
})

export default defineConfig({
  title: 'maltty',
  description:
    'A batteries-included TypeScript framework for building production CLIs. Typed commands, middleware, OAuth, and a built-in terminal UI.',
  tagline:
    "A batteries-included TypeScript framework for real CLIs. Typed commands, middleware, OAuth, and a built-in TUI, without the boilerplate you'd normally write first.",
  themes: [malttyTheme],
  theme: { name: 'maltty' },
  logo: '/logo.svg',
  loader: 'apple',
  actions: [
    { theme: 'brand', text: 'Quick Start', link: '/getting-started/quick-start' },
    { theme: 'alt', text: 'Introduction', link: '/getting-started/introduction' },
  ],
  sidebar: {
    below: [{ text: 'Contributing', link: '/contributing', icon: 'pixelarticons:git-merge' }],
  },
  home: {
    eyebrow: 'Ship a production CLI this afternoon',
    trust: { lead: 'Built on', names: ['yargs', 'Zod', 'tsdown', 'Bun'] },
    features: { columns: 3 },
    workspaces: { columns: 2 },
    cta: {
      title: 'Your first command in five minutes',
      subtitle:
        'Install the runtime, define a command with a Zod schema, and run it. The guide walks the whole path from argv to a compiled binary.',
      actions: [
        { theme: 'brand', text: 'Build a CLI', link: '/guides/build-a-cli' },
        { theme: 'alt', text: 'Read the Reference', link: '/reference/maltty' },
      ],
    },
  },
  sections: [
    // ── Getting Started ──
    {
      title: 'Getting Started',
      icon: 'pixelarticons:speed-fast',
      path: '/getting-started',
      items: [
        {
          title: 'Introduction',
          path: '/getting-started/introduction',
          include: 'docs/introduction.md',
        },
        {
          title: 'Quick Start',
          path: '/getting-started/quick-start',
          include: 'docs/quick-start.md',
        },
      ],
    },

    // ── Concepts ──
    {
      title: 'Concepts',
      path: '/concepts',
      icon: 'pixelarticons:lightbulb',
      items: [
        {
          title: 'Lifecycle',
          path: '/concepts/lifecycle',
          include: 'docs/concepts/lifecycle.md',
        },
        {
          title: 'Context',
          path: '/concepts/context',
          include: 'docs/concepts/context.md',
        },
        {
          title: 'Configuration',
          path: '/concepts/configuration',
          include: 'docs/concepts/configuration.md',
        },
        {
          title: 'Authentication',
          path: '/concepts/authentication',
          include: 'docs/concepts/authentication.md',
        },
        {
          title: 'Icons',
          path: '/concepts/icons',
          include: 'docs/concepts/icons.md',
        },
        {
          title: 'Screens',
          path: '/concepts/screens',
          include: 'docs/concepts/screens.md',
        },
        {
          title: 'Reporting',
          path: '/concepts/reporting',
          include: 'docs/concepts/reporting.md',
        },
      ],
    },

    // ── Guides ──
    {
      title: 'Guides',
      path: '/guides',
      icon: 'pixelarticons:book',
      items: [
        {
          title: 'Build a CLI',
          path: '/guides/build-a-cli',
          include: 'docs/guides/build-a-cli.md',
        },
        {
          title: 'Build a Compiled CLI',
          path: '/guides/build-a-compiled-cli',
          include: 'docs/guides/build-a-compiled-cli.md',
        },
        {
          title: 'Add Authentication',
          path: '/guides/add-authentication',
          include: 'docs/guides/add-authentication.md',
        },
        {
          title: 'Component Stories',
          path: '/guides/component-stories',
          include: 'docs/guides/component-stories.md',
        },
        {
          title: 'Testing Your CLI',
          path: '/guides/testing-your-cli',
          include: 'docs/guides/testing-your-cli.md',
        },
      ],
    },

    // ── Reference ──
    {
      title: 'Reference',
      path: '/reference',
      icon: 'pixelarticons:file-alt',
      items: [
        { title: 'maltty', path: '/reference/maltty', include: 'docs/reference/maltty.md' },
        { title: 'cli', path: '/reference/cli', include: 'docs/reference/cli.md' },
        {
          title: 'bootstrap',
          path: '/reference/bootstrap',
          include: 'docs/reference/bootstrap.md',
        },
        { title: 'command', path: '/reference/command', include: 'docs/reference/command.md' },
        {
          title: 'middleware',
          path: '/reference/middleware',
          include: 'docs/reference/middleware.md',
        },
        { title: 'report', path: '/reference/report', include: 'docs/reference/report.md' },
        { title: 'screen', path: '/reference/screen', include: 'docs/reference/screen.md' },
      ],
    },

    // ── Contributing ──
    {
      title: 'Contributing',
      path: '/contributing',
      icon: 'pixelarticons:git-merge',
      items: [
        {
          title: 'Concepts',
          path: '/contributing/concepts',
          items: [
            {
              title: { from: 'heading' },
              path: '/contributing/concepts/architecture',
              include: 'contributing/concepts/architecture.md',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/concepts/cli',
              include: 'contributing/concepts/cli.md',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/concepts/tech-stack',
              include: 'contributing/concepts/tech-stack.md',
            },
          ],
        },
        {
          title: 'Guides',
          path: '/contributing/guides',
          items: [
            {
              title: { from: 'heading' },
              path: '/contributing/guides/getting-started',
              include: 'contributing/guides/getting-started.md',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/guides/developing-a-feature',
              include: 'contributing/guides/developing-a-feature.md',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/guides/adding-a-cli-command',
              include: 'contributing/guides/adding-a-cli-command.md',
            },
          ],
        },
        {
          title: 'Standards',
          path: '/contributing/standards',
          items: [
            {
              title: { from: 'heading' },
              path: '/contributing/standards/typescript',
              include: 'contributing/standards/typescript/*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/documentation',
              include: 'contributing/standards/documentation/*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/git',
              include: 'contributing/standards/git-*.md',
              sort: 'alpha',
            },
          ],
        },
      ],
    },
  ],
  features: [
    {
      title: 'Type-Safe Commands',
      description:
        'Describe args with a Zod schema and the parsed args, config, and context arrive fully typed in every handler. No casting, no drift.',
      icon: 'pixelarticons:command',
    },
    {
      title: 'Middleware Pipelines',
      description:
        'Compose auth, logging, and timing as a nested onion. Each layer wraps the next in the order you declare it.',
      icon: 'pixelarticons:card-stack',
    },
    {
      title: 'Built-in Auth',
      description:
        'OAuth PKCE, device code, env vars, and file tokens. Wire up a login flow without hand-rolling a token refresh loop.',
      icon: 'pixelarticons:shield',
    },
    {
      title: 'Terminal UI',
      description:
        "Logger, spinner, prompts, colors, and formatters, all on ctx. Plain stdout when you want it, a real TUI when you don't.",
      icon: 'pixelarticons:sparkle',
    },
    {
      title: 'Config Discovery',
      description:
        "Drop a maltty.config.ts and it's found, validated with Zod, and typed at every read. No parsing glue to maintain.",
      icon: 'pixelarticons:sliders',
    },
    {
      title: 'Build & Compile',
      description:
        'Bundle to ESM with tsdown, or compile a standalone binary with Bun. Ship one file that runs without a Node install.',
      icon: 'pixelarticons:zap',
    },
  ],
  workspaces: [
    {
      title: 'Packages',
      icon: 'pixelarticons:code',
      items: [
        {
          title: 'maltty',
          description: 'The runtime framework for commands, middleware, auth, and terminal UI.',
          path: '/reference/maltty',
          icon: 'pixelarticons:code',
          tags: ['framework', 'runtime'],
        },
        {
          title: '@maltty/cli',
          description: 'The developer CLI for scaffolding, building, and diagnostics.',
          path: '/reference/cli',
          icon: 'pixelarticons:command',
          tags: ['cli', 'tooling'],
        },
      ],
    },
  ],
  nav: [
    { title: 'Getting Started', link: '/getting-started/introduction' },
    { title: 'Concepts', link: '/concepts/lifecycle' },
    { title: 'Guides', link: '/guides/build-a-cli' },
    { title: 'Reference', link: '/reference/maltty' },
  ],
})
