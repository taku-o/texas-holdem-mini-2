import { describe, test, expect } from 'vitest'
import { getViewport, PLAYER_ID_PATTERN } from '../../e2e/helpers'

describe('getViewport', () => {
  test('viewport が設定されている場合、width と height を返す', () => {
    const testInfo = {
      project: {
        use: {
          viewport: { width: 1280, height: 720 },
        },
      },
    }

    const result = getViewport(testInfo as never)

    expect(result).toEqual({ width: 1280, height: 720 })
  })

  test('viewport が undefined の場合、エラーをスローする', () => {
    const testInfo = {
      project: {
        use: {
          viewport: undefined,
        },
      },
    }

    expect(() => getViewport(testInfo as never)).toThrow(
      'Viewport is not configured in playwright.config.ts',
    )
  })

  test('viewport が null の場合、エラーをスローする', () => {
    const testInfo = {
      project: {
        use: {
          viewport: null,
        },
      },
    }

    expect(() => getViewport(testInfo as never)).toThrow(
      'Viewport is not configured in playwright.config.ts',
    )
  })
})

describe('プレイヤーID抽出パターン', () => {
  // helpers.ts からエクスポートされた正規表現パターンのテスト

  test('正常な player-{id} 形式からIDを抽出できる', () => {
    const testId = 'player-p1'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).not.toBeNull()
    expect(match![1]).toBe('p1')
  })

  test('複合IDを持つ player-{id} 形式からIDを抽出できる', () => {
    const testId = 'player-cpu-2'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).not.toBeNull()
    expect(match![1]).toBe('cpu-2')
  })

  test('player- プレフィックスがない文字列にはマッチしない', () => {
    const testId = 'some-other-element'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).toBeNull()
  })

  test('player-cards- 形式にはマッチするがIDにcards-プレフィックスが含まれる', () => {
    // セレクター側で除外されるため、この関数に到達しない前提
    const testId = 'player-cards-p1'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).not.toBeNull()
    expect(match![1]).toBe('cards-p1')
  })

  test('中間に player- を含む文字列にはマッチしない（先頭一致のみ）', () => {
    const testId = 'other-player-p1'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).toBeNull()
  })

  test('player- のみ（ID部分が空）にはマッチしない', () => {
    const testId = 'player-'

    const match = testId.match(PLAYER_ID_PATTERN)

    expect(match).toBeNull()
  })
})
