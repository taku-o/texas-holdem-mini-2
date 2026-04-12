// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { GameState, GamePhase } from '../../utils/gameLogic'
import { createPlayer } from '../../__tests__/helpers'

// useGameEngine のモックを定義
const mockHandleAction = vi.fn()
const mockStartGame = vi.fn()

vi.mock('../../hooks/useGameEngine', () => ({
  useGameEngine: vi.fn(),
}))

// モック後にインポート
import { useGameEngine } from '../../hooks/useGameEngine'
import App from '../../App'

const mockedUseGameEngine = vi.mocked(useGameEngine)

const createGameState = (phase: GamePhase, activePlayerIndex: number = 0): GameState => ({
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
  activePlayerIndex,
  dealerIndex: 1,
  logs: [],
})

const setupMock = (phase: GamePhase, activePlayerIndex: number = 0) => {
  mockedUseGameEngine.mockReturnValue({
    state: createGameState(phase, activePlayerIndex),
    startGame: mockStartGame,
    handleAction: mockHandleAction,
  })
}

describe('App コンポーネントの Controls 表示条件（BUG-U2）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ゲーム進行中フェーズでは Controls が表示される', () => {
    test.each<GamePhase>(['pre-flop', 'flop', 'turn', 'river'])(
      '%s フェーズで Controls がDOMに存在する',
      (phase) => {
        // Given: ゲーム進行中のフェーズ
        setupMock(phase, 0)

        // When: App をレンダリング
        render(<App />)

        // Then: Controls がDOMに存在する
        expect(screen.queryByTestId('controls')).not.toBeNull()
      },
    )
  })

  describe('ショーダウンフェーズで Controls が非表示になる', () => {
    test('showdown フェーズで Controls がDOMから削除される', () => {
      // Given: showdown フェーズ
      setupMock('showdown')

      // When: App をレンダリング
      render(<App />)

      // Then: Controls がDOMに存在しない
      expect(screen.queryByTestId('controls')).toBeNull()
    })
  })

  describe('ゲームオーバーフェーズで Controls が非表示になる', () => {
    test('game-over フェーズで Controls がDOMから削除される', () => {
      // Given: game-over フェーズ
      setupMock('game-over')

      // When: App をレンダリング
      render(<App />)

      // Then: Controls がDOMに存在しない
      expect(screen.queryByTestId('controls')).toBeNull()
    })
  })

  describe('CPUターン中でも Controls は表示される', () => {
    test('pre-flop フェーズでCPUがアクティブでも Controls がDOMに存在する', () => {
      // Given: pre-flop フェーズ、CPUプレイヤーがアクティブ（index=1）
      setupMock('pre-flop', 1)

      // When: App をレンダリング
      render(<App />)

      // Then: Controls がDOMに存在する（CPUターンでも表示はされる）
      expect(screen.queryByTestId('controls')).not.toBeNull()
    })
  })
})
