---
'@kidd-cli/cli': patch
---

Fix security vulnerabilities in dependencies: upgrade liquidjs to >=10.25.7 (DoS via circular block reference), add pnpm overrides for tar (path traversal), vite (fs.deny bypass, file read, path traversal), postcss (XSS), fast-xml-parser (injection), and uuid (buffer bounds check)
