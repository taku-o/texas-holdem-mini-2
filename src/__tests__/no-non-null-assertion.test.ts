import { describe, test, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * non-null assertion (`!`) の再発防止テスト。
 * テストコード内で `expect(...).not.toBeNull()` 後に `variable!` を使うパターンは
 * TypeScript の型推論が効かないため、`if (!x) throw new Error(...)` に統一する。
 */
describe('non-null assertion 再発防止', () => {
  // 変更セット内のテストファイルを対象にする
  const testFiles = [
    'src/__tests__/e2e-helpers.test.ts',
    'src/__tests__/vitest-config.test.ts',
    'e2e/game-layout.spec.ts',
    'e2e/idle-screen.spec.ts',
    'e2e/card-display.spec.ts',
  ]

  // identifier! パターンを検出（文字列リテラル内は除外）
  const NON_NULL_ASSERTION_PATTERN = /\b\w+!\./

  for (const filePath of testFiles) {
    test(`${filePath} に non-null assertion (!) が含まれていない`, () => {
      const absolutePath = path.resolve(__dirname, '../../', filePath)
      const content = fs.readFileSync(absolutePath, 'utf-8')

      const lines = content.split('\n')
      const violations: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // コメント行とimport行はスキップ
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.includes('import ')) continue
        // 文字列リテラル内のパターンはスキップ
        if (line.includes("'") && line.match(/['"].*!\..*['"]/)) continue

        if (NON_NULL_ASSERTION_PATTERN.test(line)) {
          violations.push(`Line ${i + 1}: ${line.trim()}`)
        }
      }

      expect(violations).toEqual([])
    })
  }
})
