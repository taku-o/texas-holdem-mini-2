import type { Player, PlayingCard, Suit, Rank } from '../types'
import { INITIAL_CHIPS } from '../utils/gameLogic'

export const card = (suit: Suit, rank: Rank): PlayingCard => ({ suit, rank })

export const createPlayer = (overrides: Partial<Player> & { id: string; name: string }): Player => ({
  chips: INITIAL_CHIPS,
  currentBet: 0,
  isActive: true,
  isHuman: false,
  cards: [],
  action: null,
  role: null,
  ...overrides,
})

export const createActivePlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) =>
    createPlayer({ id: `p${i}`, name: `Player ${i}` }),
  )
