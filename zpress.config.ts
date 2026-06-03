import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: 'maltty',
  description: 'An opinionated CLI framework',
  tagline: 'Built on yargs and Zod. Convention over configuration, end-to-end type safety.',
  theme: { name: 'midnight' },
  actions: [
    { theme: 'brand', text: 'Introduction', link: '/getting-started/introduction' },
    { theme: 'alt', text: 'Quick Start', link: '/getting-started/quick-start' },
  ],
  sidebar: {
    below: [{ text: 'Contributing', link: '/contributing', icon: 'pixelarticons:git-merge' }],
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
      icon: 'pixelarticons:book-open',
      items: [
        {
          title: 'Build a CLI',
          path: '/guides/build-a-cli',
          include: 'docs/guides/build-a-cli.md',
        },
        {
          title: 'Add Authentication',
          path: '/guides/add-authentication',
          include: 'docs/guides/add-authentication.md',
        },
        {
          title: 'Testing Your CLI',
          path: '/guides/testing-your-cli',
          include: 'docs/guides/testing-your-cli.md',
        },
        {
          title: 'Build a Compiled CLI',
          path: '/guides/build-a-compiled-cli',
          include: 'docs/guides/build-a-compiled-cli.md',
        },
      ],
    },

    // ── Reference: JavaScript ──
    {
      title: 'JavaScript',
      path: '/reference',
      icon: 'pixelarticons:terminal',
      items: [
        {
          title: 'command()',
          path: '/reference/command',
          include: 'docs/reference/command.md',
        },
        {
          title: 'middleware()',
          path: '/reference/middleware',
          include: 'docs/reference/middleware.md',
        },
        {
          title: 'cli()',
          path: '/reference/bootstrap',
          include: 'docs/reference/bootstrap.md',
        },
        {
          title: 'Context',
          path: '/reference/context',
          include: 'docs/reference/context.md',
        },
        {
          title: 'screen()',
          path: '/reference/screen',
          include: 'docs/reference/screen.md',
        },
        {
          title: 'report()',
          path: '/reference/report',
          include: 'docs/reference/report.md',
        },
      ],
    },

    // ── Reference: CLI ──
    {
      title: 'CLI',
      path: '/reference/cli',
      icon: 'pixelarticons:command',
      items: [
        {
          title: 'CLI',
          path: '/reference/cli',
          include: 'docs/reference/cli.md',
        },
      ],
    },

    // ── Contributing ──
    {
      title: 'Contributing',
      icon: 'pixelarticons:git-branch',
      standalone: true,
      items: [
        {
          title: { from: 'heading' },
          path: '/contributing/concepts',
          include: 'contributing/concepts/*.md',
          sort: 'alpha',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/guides',
          include: 'contributing/guides/*.md',
          sort: 'alpha',
        },
        {
          title: 'Standards',
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
          title: '@maltty/core',
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
