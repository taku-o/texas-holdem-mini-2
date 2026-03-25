import type { UserConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig, loadPackageJson } from './test-helpers'

describe('Vitest環境設定: vitest.config.ts', () => {
  let vitestConfig: UserConfig

  beforeAll(async () => {
    vitestConfig = await loadConfig('vitest.config.ts')
  })

  test('グローバル関数が有効化されている', () => {
    expect(vitestConfig.test?.globals).toBe(true)
  })

  test('セットアップファイルが設定されている', () => {
    expect(vitestConfig.test?.setupFiles).toContain('./src/test/setup.ts')
  })

  test('既存の除外設定が維持されている', () => {
    const excludePatterns = vitestConfig.test?.exclude
    if (!excludePatterns) throw new Error('vitest config test.exclude is not defined')

    const hasE2eExclude = excludePatterns.some(
      (pattern: string) => pattern.includes('e2e'),
    )
    expect(hasE2eExclude).toBe(true)
  })
})

describe('Vitest環境設定: npmスクリプト', () => {
  let scripts: Record<string, string>

  beforeAll(() => {
    const pkg = loadPackageJson()
    if (!pkg.scripts) throw new Error('No scripts found in package.json')
    scripts = pkg.scripts as Record<string, string>
  })

  test('testスクリプトが単発実行モードである', () => {
    expect(scripts.test).toBe('vitest run')
  })

  test('test:watchスクリプトがウォッチモードである', () => {
    expect(scripts['test:watch']).toBe('vitest')
  })
})

describe('Vitest環境設定: セットアップファイル', () => {
  test('src/test/setup.ts が存在する', () => {
    const setupPath = path.resolve(__dirname, '../test/setup.ts')
    expect(fs.existsSync(setupPath)).toBe(true)
  })
})
