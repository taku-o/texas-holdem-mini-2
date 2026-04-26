import { describe, test, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * テストファイルの未使用 import 再発防止テスト。
 * tsconfig.app.json がテストファイルを exclude しているため
 * noUnusedLocals による検出が効かない。このテストで補完する。
 */
describe('未使用 import 再発防止', () => {
  const testFiles = [
    'src/hooks/__tests__/useGameEngine.refactor.test.ts',
    'src/hooks/__tests__/useGameEngine.sidePot.test.ts',
  ]

  for (const filePath of testFiles) {
    test(`${filePath} の named import が全てファイル内で使用されている`, () => {
      const absolutePath = path.resolve(__dirname, '../../', filePath)
      const content = fs.readFileSync(absolutePath, 'utf-8')
      const lines = content.split('\n')

      const importedNames: { name: string; line: number }[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // named import から識別子を抽出（type import 含む）
        const match = line.match(/import\s+(?:type\s+)?{([^}]+)}\s+from/)
        if (!match) continue

        const names = match[1].split(',').map((s) => {
          const trimmed = s.trim()
          // "Foo as Bar" の場合は Bar（ローカル名）を使用
          const asMatch = trimmed.match(/\w+\s+as\s+(\w+)/)
          return asMatch ? asMatch[1] : trimmed
        }).filter(Boolean)

        for (const name of names) {
          importedNames.push({ name, line: i + 1 })
        }
      }

      const nonImportContent = lines
        .filter((line) => !line.match(/^\s*import\s/))
        .join('\n')

      const unused: string[] = []
      for (const { name, line } of importedNames) {
        const pattern = new RegExp(`\\b${name}\\b`)
        if (!pattern.test(nonImportContent)) {
          unused.push(`Line ${line}: "${name}" is imported but never used`)
        }
      }

      expect(unused).toEqual([])
    })
  }
})
