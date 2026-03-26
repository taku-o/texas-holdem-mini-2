import { evaluateHand, HandRank } from '../evaluator'
import type { Suit, Rank, PlayingCard } from '../../types'

const card = (suit: Suit, rank: Rank): PlayingCard => ({ suit, rank })

describe('各役のrank値', () => {
  test('ロイヤルフラッシュのrankは10', () => {
    const holeCards = [card('hearts', 'A'), card('hearts', 'K')]
    const communityCards = [card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.RoyalFlush)
  })

  test('ストレートフラッシュのrankは9', () => {
    const holeCards = [card('spades', '9'), card('spades', '8')]
    const communityCards = [card('spades', '7'), card('spades', '6'), card('spades', '5')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.StraightFlush)
  })

  test('フォーカードのrankは8', () => {
    const holeCards = [card('hearts', 'A'), card('diamonds', 'A')]
    const communityCards = [card('clubs', 'A'), card('spades', 'A'), card('hearts', 'K')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.FourOfAKind)
  })

  test('フルハウスのrankは7', () => {
    const holeCards = [card('hearts', 'K'), card('diamonds', 'K')]
    const communityCards = [card('clubs', 'K'), card('spades', 'Q'), card('hearts', 'Q')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.FullHouse)
  })

  test('フラッシュのrankは6', () => {
    const holeCards = [card('hearts', 'A'), card('hearts', 'J')]
    const communityCards = [card('hearts', '8'), card('hearts', '5'), card('hearts', '3')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.Flush)
  })

  test('ストレートのrankは5', () => {
    const holeCards = [card('hearts', '10'), card('diamonds', '9')]
    const communityCards = [card('clubs', '8'), card('spades', '7'), card('hearts', '6')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.Straight)
  })

  test('スリーカードのrankは4', () => {
    const holeCards = [card('hearts', 'Q'), card('diamonds', 'Q')]
    const communityCards = [card('clubs', 'Q'), card('spades', '7'), card('hearts', '3')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.ThreeOfAKind)
  })

  test('ツーペアのrankは3', () => {
    const holeCards = [card('hearts', 'J'), card('diamonds', 'J')]
    const communityCards = [card('clubs', '8'), card('spades', '8'), card('hearts', '3')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.TwoPair)
  })

  test('ワンペアのrankは2', () => {
    const holeCards = [card('hearts', '10'), card('diamonds', '10')]
    const communityCards = [card('clubs', '7'), card('spades', '5'), card('hearts', '2')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.OnePair)
  })

  test('ハイカードのrankは1', () => {
    const holeCards = [card('hearts', 'A'), card('diamonds', '9')]
    const communityCards = [card('clubs', '6'), card('spades', '4'), card('hearts', '2')]

    const result = evaluateHand(holeCards, communityCards)

    expect(result.rank).toBe(HandRank.HighCard)
  })
})
