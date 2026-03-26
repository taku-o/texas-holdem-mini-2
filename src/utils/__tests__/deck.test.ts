import { createDeck, shuffleDeck, SUITS, RANKS } from '../deck'

describe('createDeck', () => {
  test('52枚のカードが生成される', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
  })

  test('全カードがユニークである', () => {
    const deck = createDeck()
    const uniqueCards = new Set(deck.map((c) => `${c.suit}-${c.rank}`))
    expect(uniqueCards.size).toBe(52)
  })

  test('各スートが13枚ずつ含まれる', () => {
    const deck = createDeck()
    for (const suit of SUITS) {
      const cardsOfSuit = deck.filter((c) => c.suit === suit)
      expect(cardsOfSuit).toHaveLength(13)
    }
  })

  test('各ランクが4枚ずつ含まれる', () => {
    const deck = createDeck()
    for (const rank of RANKS) {
      const cardsOfRank = deck.filter((c) => c.rank === rank)
      expect(cardsOfRank).toHaveLength(4)
    }
  })
})

describe('shuffleDeck', () => {
  test('シャッフル後も52枚が保持される', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(52)
  })

  test('シャッフル後も全カードが保持される', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    const originalCards = new Set(deck.map((c) => `${c.suit}-${c.rank}`))
    const shuffledCards = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`))
    expect(shuffledCards).toEqual(originalCards)
  })
})
