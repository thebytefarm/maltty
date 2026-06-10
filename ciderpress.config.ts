import { defineConfig } from 'ciderpress/config'

export default defineConfig({
  title: 'maltty',
  description: 'An opinionated CLI framework',
  tagline: 'Built on yargs and Zod. Convention over configuration, end-to-end type safety.',
  theme: {
    name: 'amber',
    colors: {
      brand: '#CF9E36',
      brandDark: '#A57B26',
      brandLight: '#E4BC5C',
      brandSoft: '#F3DC9A',
    },
  },
  logo: '/logo.svg',
  loader: 'apple',
  actions: [
    { theme: 'brand', text: 'Introduction', link: '/getting-started/introduction' },
    { theme: 'alt', text: 'Quick Start', link: '/getting-started/quick-start' },
  ],
  sidebar: {
    below: [{ text: 'Contributing', link: '/contributing', icon: 'pixelarticons:git-merge' }],
  },
  home: {
    eyebrow: 'CLI framework · v0.24',
    features: { columns: 3 },
    workspaces: { columns: 2 },
    cta: {
      title: 'Ship your CLI in an afternoon',
      subtitle:
        "Type-safe commands, middleware composition, OAuth out of the box. Built-in TUI when you need it, plain stdout when you don't.",
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
        'Define commands with Zod schemas and get fully typed args, config, and context in every handler.',
      icon: 'pixelarticons:command',
    },
    {
      title: 'Middleware Pipelines',
      description: 'Compose auth, logging, timing, and custom logic with a nested onion model.',
      icon: 'pixelarticons:card-stack',
    },
    {
      title: 'Built-in Auth',
      description: 'OAuth PKCE, device code, env vars, and file tokens with zero boilerplate.',
      icon: 'pixelarticons:shield',
    },
    {
      title: 'Terminal UI',
      description: 'Logger, spinner, prompts, colors, and formatters all available on ctx.',
      icon: 'pixelarticons:sparkle',
    },
    {
      title: 'Config Discovery',
      description: 'Automatic config file loading with Zod validation and typed access.',
      icon: 'pixelarticons:sliders',
    },
    {
      title: 'Build & Compile',
      description: 'Bundle to ESM with tsdown and compile to standalone binaries with Bun.',
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
