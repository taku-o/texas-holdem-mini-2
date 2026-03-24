import { describe, test, expect } from 'vitest'
import { parse } from 'jsonc-parser'

/**
 * JSONC パースの堅牢性テスト。
 * 正規表現によるコメント除去（/\/\/.*$/gm）では文字列リテラル内の "//" も
 * 除去してしまう問題があるため、jsonc-parser パッケージへの置換を検証する。
 */
describe('JSONC パース堅牢性', () => {
  test('行コメントを除去して正しくパースできる', () => {
    // Given: 行コメント付きのJSONC
    const content = `{
      // This is a line comment
      "key": "value"
    }`

    // When: パースする
    const result = parse(content)

    // Then: コメントが除去されてパースされる
    expect(result).toEqual({ key: 'value' })
  })

  test('文字列リテラル内の "//" を破壊せずパースできる', () => {
    // Given: 文字列値に "//" を含むJSONC
    const content = `{
      "url": "https://example.com/path",
      "pattern": "src/**/*.ts"
    }`

    // When: パースする
    const result = parse(content)

    // Then: 文字列リテラル内の "//" が保持される
    expect(result.url).toBe('https://example.com/path')
    expect(result.pattern).toBe('src/**/*.ts')
  })

  test('コメントと文字列リテラル内 "//" が混在するJSONCを正しくパースできる', () => {
    // Given: 行コメントと "//" を含む文字列値が混在するJSONC
    const content = `{
      // exclude patterns for build
      "exclude": [
        "src/**/*.test.ts",
        "src/__tests__/**"
      ],
      // reference URL
      "docs": "https://vitejs.dev/config/"
    }`

    // When: パースする
    const result = parse(content)

    // Then: コメントは除去され、文字列内の "//" は保持される
    expect(result.exclude).toEqual([
      'src/**/*.test.ts',
      'src/__tests__/**',
    ])
    expect(result.docs).toBe('https://vitejs.dev/config/')
  })

  test('ブロックコメントを除去して正しくパースできる', () => {
    // Given: ブロックコメント付きのJSONC
    const content = `{
      /* block comment */
      "key": "value"
    }`

    // When: パースする
    const result = parse(content)

    // Then: ブロックコメントが除去されてパースされる
    expect(result).toEqual({ key: 'value' })
  })

  test('トレーリングカンマを含むJSONCを正しくパースできる', () => {
    // Given: トレーリングカンマ付きのJSONC（tsconfig.jsonで頻出）
    const content = `{
      "a": 1,
      "b": 2,
    }`

    // When: パースする
    const result = parse(content)

    // Then: トレーリングカンマを許容してパースされる
    expect(result).toEqual({ a: 1, b: 2 })
  })

  test('回帰: 正規表現コメント除去では文字列内の "//" が破壊されるが jsonc-parser では正しくパースできる', () => {
    // Given: 行コメントとURL文字列が混在するJSONC
    const content = `{
      // documentation reference
      "docs": "https://vitejs.dev/config/",
      "nested": "http://localhost:3000/api"
    }`

    // When: 旧アプローチ（正規表現）でコメント除去した場合
    const strippedByRegex = content.replace(/\/\/.*$/gm, '')

    // Then: 正規表現は文字列リテラル内の "//" 以降も除去してしまう
    expect(() => JSON.parse(strippedByRegex)).toThrow()

    // When: jsonc-parser でパースした場合
    const result = parse(content)

    // Then: コメントは除去され、文字列内の URL は保持される
    expect(result.docs).toBe('https://vitejs.dev/config/')
    expect(result.nested).toBe('http://localhost:3000/api')
  })
})
