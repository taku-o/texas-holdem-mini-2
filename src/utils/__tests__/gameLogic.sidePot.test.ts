import { calculateSidePots, distributePots } from '../gameLogic'
import { createPlayer, card } from '../../__tests__/helpers'
import type { PlayingCard, Pot } from '../../types'

describe('calculateSidePots', () => {
  test('全員同額ベットでポット数1を返す', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 100 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 100 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100 }),
      createPlayer({ id: 'p3', name: 'Player 3', totalContribution: 100 }),
      createPlayer({ id: 'p4', name: 'Player 4', totalContribution: 100 }),
    ]

    const result = calculateSidePots(players)

    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(500)
    expect(result[0].eligiblePlayerIds).toHaveLength(5)
  })

  test('1人少額オールインでポット数2を返す', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 50, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 100 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100 }),
      createPlayer({ id: 'p3', name: 'Player 3', totalContribution: 100 }),
      createPlayer({ id: 'p4', name: 'Player 4', totalContribution: 100 }),
    ]

    const result = calculateSidePots(players)

    expect(result).toHaveLength(2)
    expect(result[0].amount).toBe(250)
    expect(result[0].eligiblePlayerIds).toHaveLength(5)
    expect(result[1].amount).toBe(200)
    expect(result[1].eligiblePlayerIds).toHaveLength(4)
    expect(result[1].eligiblePlayerIds).not.toContain('p0')
  })

  test('2人異額オールインでポット数3を返す', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 30, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 70, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100 }),
      createPlayer({ id: 'p3', name: 'Player 3', totalContribution: 100 }),
      createPlayer({ id: 'p4', name: 'Player 4', totalContribution: 100 }),
    ]

    const result = calculateSidePots(players)

    expect(result).toHaveLength(3)
    expect(result[0].amount).toBe(150)
    expect(result[0].eligiblePlayerIds).toHaveLength(5)
    expect(result[1].amount).toBe(160)
    expect(result[1].eligiblePlayerIds).toHaveLength(4)
    expect(result[1].eligiblePlayerIds).not.toContain('p0')
    expect(result[2].amount).toBe(90)
    expect(result[2].eligiblePlayerIds).toHaveLength(3)
    expect(result[2].eligiblePlayerIds).not.toContain('p0')
    expect(result[2].eligiblePlayerIds).not.toContain('p1')
  })

  test('フォールドプレイヤーの貢献はポットに含みeligibleから除外する', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 50, action: 'fold' }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 100 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100 }),
      createPlayer({ id: 'p3', name: 'Player 3', totalContribution: 100 }),
      createPlayer({ id: 'p4', name: 'Player 4', totalContribution: 100 }),
    ]

    const result = calculateSidePots(players)

    const totalAmount = result.reduce((sum, pot) => sum + pot.amount, 0)
    expect(totalAmount).toBe(450)
    for (const pot of result) {
      expect(pot.eligiblePlayerIds).not.toContain('p0')
    }
  })

  test('チップ保存則: ポット合計がtotalContribution合計と一致する', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 30, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 70, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100, action: 'fold' }),
      createPlayer({ id: 'p3', name: 'Player 3', totalContribution: 100 }),
      createPlayer({ id: 'p4', name: 'Player 4', totalContribution: 100 }),
    ]

    const result = calculateSidePots(players)

    const totalPotAmount = result.reduce((sum, pot) => sum + pot.amount, 0)
    const totalContribution = players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(totalPotAmount).toBe(totalContribution)
  })

  test('入力のplayers配列を変更しない', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 50, action: 'all-in', chips: 0 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 100 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 100 }),
    ]
    const originalPlayers = players.map(p => ({ ...p }))

    calculateSidePots(players)

    expect(players).toEqual(originalPlayers)
  })

  test('空配列の入力で空配列を返す', () => {
    const result = calculateSidePots([])

    expect(result).toEqual([])
  })

  test('全員のtotalContributionが0の場合に空配列を返す', () => {
    const players = [
      createPlayer({ id: 'p0', name: 'Player 0', totalContribution: 0 }),
      createPlayer({ id: 'p1', name: 'Player 1', totalContribution: 0 }),
      createPlayer({ id: 'p2', name: 'Player 2', totalContribution: 0 }),
    ]

    const result = calculateSidePots(players)

    expect(result).toEqual([])
  })
})

describe('distributePots', () => {
  const communityCards: PlayingCard[] = [
    card('clubs', '2'),
    card('diamonds', '3'),
    card('spades', '8'),
    card('clubs', 'J'),
    card('diamonds', '9'),
  ]

  test('単一ポット・1勝者: 勝者のchipsにポット額が加算される', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 100,
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 100,
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
    ]
    const pots: Pot[] = [{ amount: 200, eligiblePlayerIds: ['p0', 'p1'] }]

    const result = distributePots(pots, players, communityCards)

    expect(result.awards).toHaveLength(1)
    expect(result.awards[0].playerId).toBe('p0')
    expect(result.awards[0].amount).toBe(200)
    expect(result.updatedPlayers[0].chips).toBe(1100)
    expect(result.updatedPlayers[1].chips).toBe(900)
    const totalChipsBefore = players.reduce((s, p) => s + p.chips, 0) + 200
    const totalChipsAfter = result.updatedPlayers.reduce((s, p) => s + p.chips, 0)
    expect(totalChipsAfter).toBe(totalChipsBefore)
  })

  test('複数ポット: 勝者が各ポットで異なる場合', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 0, totalContribution: 50, action: 'all-in',
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 100,
        cards: [card('spades', 'K'), card('hearts', 'K')],
      }),
      createPlayer({
        id: 'p2', name: 'Player 2', chips: 900, totalContribution: 100,
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
    ]
    const pots: Pot[] = [
      { amount: 150, eligiblePlayerIds: ['p0', 'p1', 'p2'] },
      { amount: 100, eligiblePlayerIds: ['p1', 'p2'] },
    ]

    const result = distributePots(pots, players, communityCards)

    expect(result.awards).toHaveLength(2)
    expect(result.awards[0].playerId).toBe('p0')
    expect(result.awards[0].amount).toBe(150)
    expect(result.awards[1].playerId).toBe('p1')
    expect(result.awards[1].amount).toBe(100)
    expect(result.updatedPlayers[0].chips).toBe(150)
    expect(result.updatedPlayers[1].chips).toBe(1000)
    expect(result.updatedPlayers[2].chips).toBe(900)
  })

  test('同スコア2人・均等割り切れ: 各50ずつ分配', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 50,
        cards: [card('spades', 'K'), card('spades', 'Q')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 50,
        cards: [card('hearts', 'K'), card('hearts', 'Q')],
      }),
    ]
    const pots: Pot[] = [{ amount: 100, eligiblePlayerIds: ['p0', 'p1'] }]

    const result = distributePots(pots, players, communityCards)

    expect(result.awards).toHaveLength(2)
    expect(result.awards[0].playerId).toBe('p0')
    expect(result.awards[0].amount).toBe(50)
    expect(result.awards[1].playerId).toBe('p1')
    expect(result.awards[1].amount).toBe(50)
    expect(result.updatedPlayers[0].chips).toBe(950)
    expect(result.updatedPlayers[1].chips).toBe(950)
  })

  test('同スコア2人・余りあり: 最小インデックスに余り1チップ付与', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 50, action: 'fold',
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 50,
        cards: [card('spades', 'K'), card('spades', 'Q')],
      }),
      createPlayer({
        id: 'p2', name: 'Player 2', chips: 900, totalContribution: 1, action: 'fold',
        cards: [card('clubs', '4'), card('clubs', '6')],
      }),
      createPlayer({
        id: 'p3', name: 'Player 3', chips: 900, totalContribution: 50,
        cards: [card('hearts', 'K'), card('hearts', 'Q')],
      }),
    ]
    const pots: Pot[] = [{ amount: 101, eligiblePlayerIds: ['p1', 'p3'] }]

    const result = distributePots(pots, players, communityCards)

    const p1Award = result.awards.find(a => a.playerId === 'p1')!
    const p3Award = result.awards.find(a => a.playerId === 'p3')!
    expect(p1Award.amount).toBe(51)
    expect(p3Award.amount).toBe(50)
    expect(result.updatedPlayers[1].chips).toBe(951)
    expect(result.updatedPlayers[3].chips).toBe(950)
  })

  test('同スコア3人: 余りは最小インデックスに付与', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 34,
        cards: [card('spades', 'K'), card('spades', 'Q')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 33,
        cards: [card('hearts', 'K'), card('hearts', 'Q')],
      }),
      createPlayer({
        id: 'p2', name: 'Player 2', chips: 900, totalContribution: 33,
        cards: [card('diamonds', 'K'), card('diamonds', 'Q')],
      }),
    ]
    const pots: Pot[] = [{ amount: 100, eligiblePlayerIds: ['p0', 'p1', 'p2'] }]

    const result = distributePots(pots, players, communityCards)

    expect(result.awards).toHaveLength(3)
    const p0Award = result.awards.find(a => a.playerId === 'p0')!
    const p1Award = result.awards.find(a => a.playerId === 'p1')!
    const p2Award = result.awards.find(a => a.playerId === 'p2')!
    expect(p0Award.amount).toBe(34)
    expect(p1Award.amount).toBe(33)
    expect(p2Award.amount).toBe(33)
    expect(p0Award.amount + p1Award.amount + p2Award.amount).toBe(100)
  })

  test('入力配列の不変性: players/potsを変更しない', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 100,
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: 900, totalContribution: 100,
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
    ]
    const pots: Pot[] = [{ amount: 200, eligiblePlayerIds: ['p0', 'p1'] }]
    const originalPlayers = players.map(p => ({ ...p, cards: [...p.cards] }))
    const originalPots = pots.map(pot => ({ ...pot, eligiblePlayerIds: [...pot.eligiblePlayerIds] }))

    distributePots(pots, players, communityCards)

    expect(players).toEqual(originalPlayers)
    expect(pots).toEqual(originalPots)
  })

  test('eligible 0人のポット: 例外を投げずawardsは空を返す', () => {
    const players = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 900, totalContribution: 100,
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
    ]
    const pots: Pot[] = [{ amount: 100, eligiblePlayerIds: ['nonexistent'] }]

    const result = distributePots(pots, players, communityCards)

    expect(result.awards).toEqual([])
    expect(result.updatedPlayers[0].chips).toBe(900)
  })
})
