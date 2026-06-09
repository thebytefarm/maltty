import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    index: 'src/index.ts',
    'lib/config': 'src/lib/config/index.ts',
    'lib/format': 'src/lib/format/index.ts',
    'lib/project': 'src/lib/project/index.ts',
    'lib/store': 'src/lib/store/index.ts',
    'middleware/config': 'src/middleware/config/index.ts',
    'middleware/auth': 'src/middleware/auth/index.ts',
    'middleware/http': 'src/middleware/http/index.ts',
    'middleware/figures': 'src/middleware/figures/index.ts',
    'middleware/icons': 'src/middleware/icons/index.ts',
    'middleware/report': 'src/middleware/report/index.ts',
    'test/index': 'src/test/index.ts',
    'ui/index': 'src/ui/index.ts',
    'stories/index': 'src/stories/index.ts',
  },
  format: 'esm',
})
