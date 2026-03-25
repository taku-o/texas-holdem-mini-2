import { describe, test, expect, beforeAll } from 'vitest'
import type { UserConfig } from 'vite'
import { parse as parseJsonc } from 'jsonc-parser'
import { loadConfig, loadProjectFile } from './test-helpers'

function loadTsconfigApp(): { exclude?: string[] } {
  const content = loadProjectFile('tsconfig.app.json')
  return parseJsonc(content) as { exclude?: string[] }
}

describe('Vitest設定', () => {
  let vitestConfig: UserConfig

  beforeAll(async () => {
    vitestConfig = await loadConfig('vitest.config.ts')
  })

  test('e2eディレクトリがテスト除外パターンに含まれている', () => {
    const excludePatterns = vitestConfig.test?.exclude
    if (!excludePatterns) throw new Error('vitest config test.exclude is not defined')

    const hasE2eExclude = excludePatterns.some(
      (pattern: string) => pattern.includes('e2e'),
    )
    expect(hasE2eExclude).toBe(true)
  })

  test('node_modulesがテスト除外パターンに含まれている', () => {
    const excludePatterns = vitestConfig.test?.exclude
    if (!excludePatterns) throw new Error('vitest config test.exclude is not defined')

    const hasNodeModulesExclude = excludePatterns.some(
      (pattern: string) => pattern.includes('node_modules'),
    )
    expect(hasNodeModulesExclude).toBe(true)
  })
})

describe('vite.config.ts の設定分離', () => {
  test('vite.config.tsにtest設定が含まれていない', async () => {
    const config = await loadConfig('vite.config.ts')
    expect(config.test).toBeUndefined()
  })

  test('vitest.config.tsがプラグイン定義を重複せずvite.config.tsを参照している', () => {
    const source = loadProjectFile('vitest.config.ts')

    expect(source).toMatch(/import\s+.*from\s+['"]\.\/vite\.config['"]/)
    expect(source).not.toMatch(/@vitejs\/plugin-react/)
    expect(source).not.toMatch(/@tailwindcss\/vite/)
  })
})

describe('tsconfig.app.json テストファイル除外', () => {
  test('テストファイルがTypeScriptビルド対象から除外されている', () => {
    const tsconfig = loadTsconfigApp()
    const excludePatterns = tsconfig.exclude

    if (!excludePatterns) throw new Error('tsconfig.app.json exclude is not defined')
    const hasTestExclude = excludePatterns.some(
      (pattern: string) => pattern.includes('*.test.ts'),
    )
    const hasTestDirExclude = excludePatterns.some(
      (pattern: string) => pattern.includes('__tests__'),
    )
    expect(hasTestExclude).toBe(true)
    expect(hasTestDirExclude).toBe(true)
  })
})
