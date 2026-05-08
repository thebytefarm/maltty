import { describe, expect, it } from 'vitest'

import type { ScanResult } from '../types.js'
import { generateAutoloaderParts, generateStaticAutoloader } from './generate-autoloader.js'

const TAG_PATH = '/project/node_modules/@kidd-cli/utils/src/tag.ts'

describe('static autoloader generation', () => {
  it('should generate static imports for flat command files', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [
        { filePath: '/project/commands/status.ts', name: 'status' },
        { filePath: '/project/commands/whoami.ts', name: 'whoami' },
      ],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain("import _status from 'file:///project/commands/status.ts'")
    expect(code).toContain("import _whoami from 'file:///project/commands/whoami.ts'")
    expect(code).toContain("'status': _status")
    expect(code).toContain("'whoami': _whoami")
    expect(code).toContain('export async function autoload()')
    expect(code).toContain('return commands')
  })

  it('should generate withTag wrapper for directory with index', () => {
    const scan: ScanResult = {
      dirs: [
        {
          dirs: [],
          files: [
            { filePath: '/project/commands/deploy/preview.ts', name: 'preview' },
            { filePath: '/project/commands/deploy/production.ts', name: 'production' },
          ],
          index: '/project/commands/deploy/index.ts',
          name: 'deploy',
        },
      ],
      files: [],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain("import _deploy from 'file:///project/commands/deploy/index.ts'")
    expect(code).toContain(
      "import _deploy_preview from 'file:///project/commands/deploy/preview.ts'"
    )
    expect(code).toContain(
      "import _deploy_production from 'file:///project/commands/deploy/production.ts'"
    )
    expect(code).toContain('withTag({ ..._deploy, commands:')
    expect(code).toContain("'preview': _deploy_preview")
    expect(code).toContain("'production': _deploy_production")
    expect(code).toContain("}, 'Command')")
  })

  it('should generate withTag wrapper for directory without index', () => {
    const scan: ScanResult = {
      dirs: [
        {
          dirs: [],
          files: [{ filePath: '/project/commands/auth/login.ts', name: 'login' }],
          name: 'auth',
        },
      ],
      files: [],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).not.toContain('import _auth from')
    expect(code).toContain("import _auth_login from 'file:///project/commands/auth/login.ts'")
    expect(code).toContain("'auth': withTag({ commands:")
    expect(code).toContain("'login': _auth_login")
  })

  it('should import withTag from the provided tag module path', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain(`import { withTag } from 'file://${TAG_PATH}'`)
  })

  it('should handle nested subdirectories', () => {
    const scan: ScanResult = {
      dirs: [
        {
          dirs: [
            {
              dirs: [],
              files: [{ filePath: '/project/commands/deploy/cloud/aws.ts', name: 'aws' }],
              name: 'cloud',
            },
          ],
          files: [],
          index: '/project/commands/deploy/index.ts',
          name: 'deploy',
        },
      ],
      files: [],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain("import _deploy from 'file:///project/commands/deploy/index.ts'")
    expect(code).toContain(
      "import _deploy_cloud_aws from 'file:///project/commands/deploy/cloud/aws.ts'"
    )
    expect(code).toContain("'cloud': withTag({ commands:")
    expect(code).toContain("'aws': _deploy_cloud_aws")
  })

  it('should handle empty scan result', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain('const commands = {}')
    expect(code).toContain('export async function autoload()')
  })

  it('should combine flat files and directory commands', () => {
    const scan: ScanResult = {
      dirs: [
        {
          dirs: [],
          files: [{ filePath: '/project/commands/deploy/preview.ts', name: 'preview' }],
          index: '/project/commands/deploy/index.ts',
          name: 'deploy',
        },
      ],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).toContain("'status': _status")
    expect(code).toContain("'deploy': withTag(")
    expect(code).toContain("'preview': _deploy_preview")
  })
})

describe('autoloader parts generation', () => {
  it('should use dynamic imports inside autoload function', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const parts = generateAutoloaderParts({ scan, tagModulePath: TAG_PATH })

    expect(parts.imports).toBe('')
    expect(parts.region).toContain("import('file:///project/commands/status.ts')")
    expect(parts.region).toContain('{ default: _status }')
    expect(parts.region).toContain('await Promise.all')
    expect(parts.region).toContain('async function autoload()')
    expect(parts.region).not.toContain('export')
  })

  it('should include region markers', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const parts = generateAutoloaderParts({ scan, tagModulePath: TAG_PATH })

    expect(parts.region).toContain('//#region src/autoload.ts (static)')
    expect(parts.region).toContain('//#endregion')
  })

  it('should return empty autoloader for empty scan', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [],
    }

    const parts = generateAutoloaderParts({ scan, tagModulePath: TAG_PATH })

    expect(parts.imports).toBe('')
    expect(parts.region).toContain('return {}')
  })

  it('should use withTag in commands object for directory commands', () => {
    const scan: ScanResult = {
      dirs: [
        {
          dirs: [],
          files: [{ filePath: '/project/commands/auth/login.ts', name: 'login' }],
          name: 'auth',
        },
      ],
      files: [],
    }

    const parts = generateAutoloaderParts({ scan, tagModulePath: TAG_PATH })

    expect(parts.imports).toBe('')
    expect(parts.region).toContain("import('file:///project/commands/auth/login.ts')")
    expect(parts.region).toContain("'auth': withTag(")
  })
})

describe('module specifier generation', () => {
  it('should emit file:// URL imports rather than raw paths', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).not.toContain("from '/project/commands/status.ts'")
    expect(code).toContain("from 'file:///project/commands/status.ts'")
  })

  it('should emit file:// URL for the tag module import', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const code = generateStaticAutoloader({ scan, tagModulePath: TAG_PATH })

    expect(code).not.toContain(`from '${TAG_PATH}'`)
    expect(code).toContain(`from 'file://${TAG_PATH}'`)
  })

  it('should emit file:// URL inside dynamic import calls', () => {
    const scan: ScanResult = {
      dirs: [],
      files: [{ filePath: '/project/commands/status.ts', name: 'status' }],
    }

    const parts = generateAutoloaderParts({ scan, tagModulePath: TAG_PATH })

    expect(parts.region).not.toContain("import('/project/commands/status.ts')")
    expect(parts.region).toContain("import('file:///project/commands/status.ts')")
  })
})
