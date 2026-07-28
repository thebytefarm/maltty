---
'maltty': patch
'@maltty/cli': patch
'@maltty/config': patch
'@maltty/utils': patch
'@maltty/bundler': patch
---

Upgrade dependencies to their latest versions — runtime deps (yargs, liquidjs, fs-extra, ink, react, es-toolkit) and dev tooling (oxlint, oxfmt, tsdown, turbo, vite, @rspress/core, ciderpress). TypeScript held at 6.x because `@typescript-eslint` (loaded by oxlint's JS plugins) does not yet support TypeScript 7.
