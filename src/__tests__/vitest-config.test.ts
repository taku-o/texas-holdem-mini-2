import { describe, test, expect, beforeAll } from 'vitest'
import { loadConfigFromFile } from 'vite'
import type { UserConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parse as parseJsonc } from 'jsonc-parser'

async function loadConfig(filename: string): Promise<UserConfig> {
  const configPath = path.resolve(__dirname, '../../', filename)
  const result = await loadConfigFromFile({ command: 'serve', mode: 'test' }, configPath)
  if (!result) {
    throw new Error(`Failed to load config from ${configPath}`)
  }
  return result.config
}

function loadTsconfigApp(): { exclude?: string[] } {
  const configPath = path.resolve(__dirname, '../../tsconfig.app.json')
  const content = fs.readFileSync(configPath, 'utf-8')
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
    // Given: vite.config.tsを読み込む
    const config = await loadConfig('vite.config.ts')

    // Then: testプロパティが存在しない
    expect(config.test).toBeUndefined()
  })

  test('vitest.config.tsがプラグイン定義を重複せずvite.config.tsを参照している', () => {
    const vitestConfigPath = path.resolve(__dirname, '../../vitest.config.ts')
    const source = fs.readFileSync(vitestConfigPath, 'utf-8')

    // vitest.config.tsはvite.configをimportして参照すべき
    expect(source).toMatch(/import\s+.*from\s+['"]\.\/vite\.config['"]/)
    // プラグインの直接importがないこと（DRY違反の再発防止）
    expect(source).not.toMatch(/@vitejs\/plugin-react/)
    expect(source).not.toMatch(/@tailwindcss\/vite/)
  })
})

describe('tsconfig.app.json テストファイル除外', () => {
  test('テストファイルがTypeScriptビルド対象から除外されている', () => {
    // Given: tsconfig.app.json を読み込む
    const tsconfig = loadTsconfigApp()

    // When: exclude パターンを取得する
    const excludePatterns = tsconfig.exclude

    // Then: テストファイルパターンが除外されている
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
