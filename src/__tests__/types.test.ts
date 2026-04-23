import { describe, test, expect } from 'vitest'
import type { Player, Pot } from '../types'
import { createPlayer, createActivePlayers } from './helpers'

describe('Player 型: totalContribution フィールド', () => {
  test('createPlayer で生成した Player の totalContribution が 0 である', () => {
    // Given: デフォルト設定で Player を生成
    const player = createPlayer({ id: 'p1', name: 'Alice' })

    // When: totalContribution を参照
    const contribution = player.totalContribution

    // Then: 初期値は 0
    expect(contribution).toBe(0)
  })

  test('createPlayer で totalContribution を指定できる', () => {
    // Given: totalContribution を明示的に指定
    const player = createPlayer({ id: 'p1', name: 'Alice', totalContribution: 500 })

    // Then: 指定した値が反映される
    expect(player.totalContribution).toBe(500)
  })

  test('createActivePlayers で生成した全 Player の totalContribution が 0 である', () => {
    // Given: 4人の Player を生成
    const players = createActivePlayers(4)

    // Then: 全員の totalContribution が 0
    for (const player of players) {
      expect(player.totalContribution).toBe(0)
    }
  })

  test('totalContribution は負の値を型レベルでは許容するが、不変条件として 0 以上であること', () => {
    // Given: totalContribution = 0 の Player
    const player = createPlayer({ id: 'p1', name: 'Alice' })

    // Then: 不変条件 totalContribution >= 0
    expect(player.totalContribution).toBeGreaterThanOrEqual(0)
  })
})

describe('Pot 型', () => {
  test('Pot オブジェクトが amount と eligiblePlayerIds を持つ', () => {
    // Given: Pot オブジェクトを構築
    const pot: Pot = {
      amount: 300,
      eligiblePlayerIds: ['p1', 'p2', 'p3'],
    }

    // Then: フィールドが正しく設定される
    expect(pot.amount).toBe(300)
    expect(pot.eligiblePlayerIds).toEqual(['p1', 'p2', 'p3'])
  })

  test('Pot の eligiblePlayerIds が空配列でも型として有効である', () => {
    // Given: eligiblePlayerIds が空の Pot
    const pot: Pot = {
      amount: 100,
      eligiblePlayerIds: [],
    }

    // Then: 型としては構築可能（ビジネスルールでは eligiblePlayerIds.length > 0 が不変条件）
    expect(pot.eligiblePlayerIds).toHaveLength(0)
  })

  test('Pot の amount が正の値である場合に正しく構築できる', () => {
    // Given: 正の amount を持つ Pot
    const pot: Pot = {
      amount: 1,
      eligiblePlayerIds: ['p1'],
    }

    // Then: 最小の正の amount でも構築可能
    expect(pot.amount).toBe(1)
    expect(pot.eligiblePlayerIds).toEqual(['p1'])
  })
})

describe('Player 型と Pot 型の連携', () => {
  test('Player の totalContribution から Pot を構築する基本シナリオ', () => {
    // Given: 3人の Player がそれぞれ異なる totalContribution を持つ
    const players: Player[] = [
      createPlayer({ id: 'p1', name: 'Alice', totalContribution: 100 }),
      createPlayer({ id: 'p2', name: 'Bob', totalContribution: 100 }),
      createPlayer({ id: 'p3', name: 'Charlie', totalContribution: 100 }),
    ]

    // When: 全員同額なのでメインポットのみ
    const mainPot: Pot = {
      amount: players.reduce((sum, p) => sum + p.totalContribution, 0),
      eligiblePlayerIds: players.map(p => p.id),
    }

    // Then: ポット金額 = 全員の totalContribution 合計
    expect(mainPot.amount).toBe(300)
    expect(mainPot.eligiblePlayerIds).toHaveLength(3)
  })
})
