# Core

API reference for `maltty`. The runtime framework for building CLI applications with typed commands, middleware pipelines, and terminal UI.

## JavaScript API

| Function                        | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| [command()](./command.md)       | Define a command with typed options and a handler |
| [middleware()](./middleware.md) | Define middleware that wraps command execution    |
| [cli()](./bootstrap.md)         | Bootstrap and run a CLI application               |
| [screen()](./screen.md)         | Define a screen command with a React/Ink render   |
| [report()](./report.md)         | Structured reporting middleware for diagnostics   |

## Core types

| Reference                         | Description                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| [Context](../concepts/context.md) | The central object threaded through handlers and middleware |

## Resources

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)
- [Ink](https://github.com/vadimdemedes/ink)
