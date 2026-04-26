// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { GameState, GamePhase } from '../../utils/gameLogic'
import type { Pot } from '../../types'
import { createPlayer } from '../../__tests__/helpers'

// useGameEngine のモックを定義
const mockHandleAction = vi.fn()
const mockStartGame = vi.fn()

vi.mock('../../hooks/useGameEngine', () => ({
  useGameEngine: vi.fn(),
}))

// calculateSidePots のモックを定義
vi.mock('../../utils/gameLogic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/gameLogic')>()
  return {
    ...actual,
    calculateSidePots: vi.fn(),
  }
})

// モック後にインポート
import { useGameEngine } from '../../hooks/useGameEngine'
import { calculateSidePots } from '../../utils/gameLogic'
import App from '../../App'

const mockedUseGameEngine = vi.mocked(useGameEngine)
const mockedCalculateSidePots = vi.mocked(calculateSidePots)

const createGameState = (phase: GamePhase, overrides: Partial<GameState> = {}): GameState => ({
  players: [
    createPlayer({ id: 'human', name: 'You', isHuman: true, cards: [] }),
    createPlayer({ id: 'cpu1', name: 'CPU 1', isHuman: false, cards: [] }),
    createPlayer({ id: 'cpu2', name: 'CPU 2', isHuman: false, cards: [] }),
    createPlayer({ id: 'cpu3', name: 'CPU 3', isHuman: false, cards: [] }),
    createPlayer({ id: 'cpu4', name: 'CPU 4', isHuman: false, cards: [] }),
  ],
  communityCards: [],
  deck: [],
  pot: 100,
  currentBet: 20,
  phase,
  activePlayerIndex: 0,
  dealerIndex: 1,
  logs: [],
  ...overrides,
})

describe('App コンポーネントのサイドポット統合', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateSidePots の結果が Table に渡される', () => {
    test('サイドポットあり時、pot-item が描画される', () => {
      // Given: calculateSidePots が 2 つのポットを返す
      const pots: Pot[] = [
        { amount: 200, eligiblePlayerIds: ['human', 'cpu1', 'cpu2'] },
        { amount: 100, eligiblePlayerIds: ['cpu1', 'cpu2'] },
      ]
      mockedCalculateSidePots.mockReturnValue(pots)
      mockedUseGameEngine.mockReturnValue({
        state: createGameState('flop', { pot: 300 }),
        startGame: mockStartGame,
        handleAction: mockHandleAction,
      })

      // When: App をレンダリング
      render(<App />)

      // Then: pot-item が 2 つ表示される
      expect(screen.getAllByTestId('pot-item')).toHaveLength(2)
    })

    test('サイドポットなし時、pot-item が描画されない', () => {
      // Given: calculateSidePots が 1 つのポットを返す
      const pots: Pot[] = [
        { amount: 100, eligiblePlayerIds: ['human', 'cpu1', 'cpu2', 'cpu3', 'cpu4'] },
      ]
      mockedCalculateSidePots.mockReturnValue(pots)
      mockedUseGameEngine.mockReturnValue({
        state: createGameState('flop', { pot: 100 }),
        startGame: mockStartGame,
        handleAction: mockHandleAction,
      })

      // When: App をレンダリング
      render(<App />)

      // Then: pot-item が存在しない
      expect(screen.queryAllByTestId('pot-item')).toHaveLength(0)
    })
  })

  describe('calculateSidePots が state.players で呼び出される', () => {
    test('レンダリング時に calculateSidePots が players 引数で呼ばれる', () => {
      // Given: ゲーム進行中の状態
      const state = createGameState('flop')
      mockedCalculateSidePots.mockReturnValue([])
      mockedUseGameEngine.mockReturnValue({
        state,
        startGame: mockStartGame,
        handleAction: mockHandleAction,
      })

      // When: App をレンダリング
      render(<App />)

      // Then: calculateSidePots が state.players で呼ばれる
      expect(mockedCalculateSidePots).toHaveBeenCalledWith(state.players)
    })
  })

  describe('既存の pot prop が維持される', () => {
    test('pot-display に合計ポット金額が表示される', () => {
      // Given: pot が 500、calculateSidePots は空配列
      mockedCalculateSidePots.mockReturnValue([])
      mockedUseGameEngine.mockReturnValue({
        state: createGameState('flop', { pot: 500 }),
        startGame: mockStartGame,
        handleAction: mockHandleAction,
      })

      // When: App をレンダリング
      render(<App />)

      // Then: pot-display に $500 が表示される
      const potDisplay = screen.getByTestId('pot-display')
      expect(potDisplay.textContent).toContain('$500')
    })
  })
})
