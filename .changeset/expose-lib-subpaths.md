---
'maltty': minor
---

Expose the `maltty/store`, `maltty/project`, and `maltty/format` subpath exports. These modules were already built and documented, but the `exports` map omitted them, so the imports failed to resolve.

- `maltty/store` — `createStore`, a file-backed JSON store that resolves project-local vs global directories
- `maltty/project` — `findProjectRoot`, `resolvePath`, `resolveLocalPath`, `resolveGlobalPath`
- `maltty/format` — standalone terminal formatters (`formatCheck`, `formatDuration`, `formatFinding`, `formatCodeFrame`, `formatSummary`)
