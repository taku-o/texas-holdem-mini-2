import { describe, test, expect } from 'vitest'
import { loadConfigFromFile } from 'vite'
import type { UserConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

async function loadViteConfig(): Promise<UserConfig> {
  const configPath = path.resolve(__dirname, '../../vite.config.ts')
  const result = await loadConfigFromFile({ command: 'serve', mode: 'test' }, configPath)
  if (!result) {
    throw new Error(`Failed to load config from ${configPath}`)
  }
  return result.config
}

function loadTsconfigApp(): { exclude?: string[] } {
  const configPath = path.resolve(__dirname, '../../tsconfig.app.json')
  const content = fs.readFileSync(configPath, 'utf-8')
  // tsconfig.json はコメント付きJSON（JSONC）のため、コメントを除去してパースする
  const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return JSON.parse(stripped) as { exclude?: string[] }
}

describe('Vitest設定', () => {
  test('e2eディレクトリがテスト除外パターンに含まれている', async () => {
    // Given: プロジェクトルートのVite設定を読み込む
    const config = await loadViteConfig()

    // When: test.exclude を取得する
    const excludePatterns = config.test?.exclude

    // Then: e2eディレクトリが除外されている
    expect(excludePatterns).toBeDefined()
    const hasE2eExclude = excludePatterns!.some(
      (pattern: string) => pattern.includes('e2e'),
    )
    expect(hasE2eExclude).toBe(true)
  })

  test('node_modulesがテスト除外パターンに含まれている', async () => {
    // Given: プロジェクトルートのVite設定を読み込む
    const config = await loadViteConfig()

    // When: test.exclude を取得する
    const excludePatterns = config.test?.exclude

    // Then: node_modulesが除外されている
    expect(excludePatterns).toBeDefined()
    const hasNodeModulesExclude = excludePatterns!.some(
      (pattern: string) => pattern.includes('node_modules'),
    )
    expect(hasNodeModulesExclude).toBe(true)
  })
})

describe('tsconfig.app.json テストファイル除外', () => {
  test('テストファイルがTypeScriptビルド対象から除外されている', () => {
    // Given: tsconfig.app.json を読み込む
    const tsconfig = loadTsconfigApp()

    // When: exclude パターンを取得する
    const excludePatterns = tsconfig.exclude

    // Then: テストファイルパターンが除外されている
    expect(excludePatterns).toBeDefined()
    const hasTestExclude = excludePatterns!.some(
      (pattern: string) => pattern.includes('*.test.ts'),
    )
    const hasTestDirExclude = excludePatterns!.some(
      (pattern: string) => pattern.includes('__tests__'),
    )
    expect(hasTestExclude).toBe(true)
    expect(hasTestDirExclude).toBe(true)
  })
})
