import { evaluateHand, HandRank } from '../evaluator'
import type { Suit, Rank, PlayingCard } from '../../types'

const card = (suit: Suit, rank: Rank): PlayingCard => ({ suit, rank })

const handTestCases = [
  {
    name: 'ロイヤルフラッシュ',
    holeCards: [card('hearts', 'A'), card('hearts', 'K')],
    communityCards: [card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10')],
    expectedRank: HandRank.RoyalFlush,
    expectedRankName: 'Royal Flush',
  },
  {
    name: 'ストレートフラッシュ',
    holeCards: [card('spades', '9'), card('spades', '8')],
    communityCards: [card('spades', '7'), card('spades', '6'), card('spades', '5')],
    expectedRank: HandRank.StraightFlush,
    expectedRankName: 'Straight Flush',
  },
  {
    name: 'フォーカード',
    holeCards: [card('hearts', 'A'), card('diamonds', 'A')],
    communityCards: [card('clubs', 'A'), card('spades', 'A'), card('hearts', 'K')],
    expectedRank: HandRank.FourOfAKind,
    expectedRankName: 'Four of a Kind',
  },
  {
    name: 'フルハウス',
    holeCards: [card('hearts', 'K'), card('diamonds', 'K')],
    communityCards: [card('clubs', 'K'), card('spades', 'Q'), card('hearts', 'Q')],
    expectedRank: HandRank.FullHouse,
    expectedRankName: 'Full House',
  },
  {
    name: 'フラッシュ',
    holeCards: [card('hearts', 'A'), card('hearts', 'J')],
    communityCards: [card('hearts', '8'), card('hearts', '5'), card('hearts', '3')],
    expectedRank: HandRank.Flush,
    expectedRankName: 'Flush',
  },
  {
    name: 'ストレート',
    holeCards: [card('hearts', '10'), card('diamonds', '9')],
    communityCards: [card('clubs', '8'), card('spades', '7'), card('hearts', '6')],
    expectedRank: HandRank.Straight,
    expectedRankName: 'Straight',
  },
  {
    name: 'スリーカード',
    holeCards: [card('hearts', 'Q'), card('diamonds', 'Q')],
    communityCards: [card('clubs', 'Q'), card('spades', '7'), card('hearts', '3')],
    expectedRank: HandRank.ThreeOfAKind,
    expectedRankName: 'Three of a Kind',
  },
  {
    name: 'ツーペア',
    holeCards: [card('hearts', 'J'), card('diamonds', 'J')],
    communityCards: [card('clubs', '8'), card('spades', '8'), card('hearts', '3')],
    expectedRank: HandRank.TwoPair,
    expectedRankName: 'Two Pair',
  },
  {
    name: 'ワンペア',
    holeCards: [card('hearts', '10'), card('diamonds', '10')],
    communityCards: [card('clubs', '7'), card('spades', '5'), card('hearts', '2')],
    expectedRank: HandRank.OnePair,
    expectedRankName: 'One Pair',
  },
  {
    name: 'ハイカード',
    holeCards: [card('hearts', 'A'), card('diamonds', '9')],
    communityCards: [card('clubs', '6'), card('spades', '4'), card('hearts', '2')],
    expectedRank: HandRank.HighCard,
    expectedRankName: 'High Card',
  },
]

describe('各役のrank値とrankName', () => {
  test.each(handTestCases)(
    '$name のrankとrankNameが正しい',
    ({ holeCards, communityCards, expectedRank, expectedRankName }) => {
      const result = evaluateHand(holeCards, communityCards)

      expect(result.rank).toBe(expectedRank)
      expect(result.rankName).toBe(expectedRankName)
    },
  )
})

describe('スコアの大小関係', () => {
  let scores: { name: string; score: number }[]

  beforeAll(() => {
    scores = handTestCases.map(({ name, holeCards, communityCards }) => ({
      name,
      score: evaluateHand(holeCards, communityCards).score,
    }))
  })

  test.each(handTestCases.slice(0, -1).map((current, i) => ({
    stronger: current.name,
    weaker: handTestCases[i + 1].name,
    index: i,
  })))(
    '$stronger のスコアが $weaker より大きい',
    ({ index }) => {
      expect(scores[index].score).toBeGreaterThan(scores[index + 1].score)
    },
  )
})

describe('同役キッカー比較', () => {
  test('ワンペアA+キッカーK のスコアが ワンペアA+キッカーQ より大きい', () => {
    const pairAWithKickerK = evaluateHand(
      [card('hearts', 'A'), card('diamonds', 'K')],
      [card('clubs', 'A'), card('spades', '7'), card('hearts', '3')],
    )
    const pairAWithKickerQ = evaluateHand(
      [card('hearts', 'A'), card('diamonds', 'Q')],
      [card('clubs', 'A'), card('spades', '7'), card('hearts', '3')],
    )

    expect(pairAWithKickerK.rank).toBe(HandRank.OnePair)
    expect(pairAWithKickerQ.rank).toBe(HandRank.OnePair)
    expect(pairAWithKickerK.score).toBeGreaterThan(pairAWithKickerQ.score)
  })
})

describe('ホイールストレート', () => {
  test('ホイールストレートのrankがStraight(5)である', () => {
    const holeCards = [card('hearts', 'A'), card('diamonds', '2')]
    const communityCards = [card('clubs', '3'), card('spades', '4'), card('hearts', '5')]
    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.Straight)
  })

  test('ホイールストレートのスコアが通常ストレート(2-3-4-5-6)より小さい', () => {
    const wheelResult = evaluateHand(
      [card('hearts', 'A'), card('diamonds', '2')],
      [card('clubs', '3'), card('spades', '4'), card('hearts', '5')],
    )
    const normalResult = evaluateHand(
      [card('hearts', '2'), card('diamonds', '3')],
      [card('clubs', '4'), card('spades', '5'), card('hearts', '6')],
    )

    expect(normalResult.rank).toBe(HandRank.Straight)
    expect(wheelResult.score).toBeLessThan(normalResult.score)
  })
})

describe('7枚入力', () => {
  test('bestCardsの長さが5である', () => {
    const holeCards = [card('hearts', 'A'), card('diamonds', 'K')]
    const communityCards = [
      card('clubs', 'Q'),
      card('spades', 'J'),
      card('hearts', '10'),
      card('diamonds', '5'),
      card('clubs', '3'),
    ]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.bestCards).toHaveLength(5)
  })
})

// 0枚入力時、rankはHighCard(1)だがrankNameは'High Card'ではなく'None'を返す。
// これはevaluator.tsの仕様で、カードなしの状態を通常のハイカードと区別するための挙動。
describe('0枚入力', () => {
  test('rankがHighCard(1)である', () => {
    const result = evaluateHand([], [])
    expect(result.rank).toBe(HandRank.HighCard)
  })

  test('scoreが0である', () => {
    const result = evaluateHand([], [])
    expect(result.score).toBe(0)
  })

  test('rankNameがNoneである', () => {
    const result = evaluateHand([], [])
    expect(result.rankName).toBe('None')
  })
})
