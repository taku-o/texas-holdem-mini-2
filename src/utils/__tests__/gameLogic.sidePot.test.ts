import { calculateSidePots } from '../gameLogic'
import { createPlayer } from '../../__tests__/helpers'

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
