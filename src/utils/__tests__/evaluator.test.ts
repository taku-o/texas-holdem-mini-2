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
