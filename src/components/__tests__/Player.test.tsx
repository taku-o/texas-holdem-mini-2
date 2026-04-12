// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { Player } from '../Player'
import { createPlayer, card } from '../../__tests__/helpers'

const twoCards = [card('hearts', 'A'), card('spades', 'K')]

describe('Player コンポーネントのカード表示条件', () => {
  describe('オールイン状態のCPUプレイヤー（BUG-U1）', () => {
    test('ショーダウン前はカードが裏面表示される', () => {
      // Given: オールイン状態のCPUプレイヤー、ショーダウン前（revealCards=false）
      const cpuPlayer = createPlayer({
        id: 'cpu1',
        name: 'CPU 1',
        isHuman: false,
        action: 'all-in',
        cards: twoCards,
      })

      // When: revealCards=false でレンダリング
      render(
        <Player
          player={cpuPlayer}
          positionClass=""
          isCurrentTurn={false}
          revealCards={false}
        />,
      )

      // Then: カードが裏面表示される
      const faceDownCards = screen.getAllByTestId('card-face-down')
      expect(faceDownCards).toHaveLength(2)
      expect(screen.queryAllByTestId('card-face-up')).toHaveLength(0)
    })

    test('ショーダウン時はカードが表面表示される', () => {
      // Given: オールイン状態のCPUプレイヤー、ショーダウン（revealCards=true）
      const cpuPlayer = createPlayer({
        id: 'cpu1',
        name: 'CPU 1',
        isHuman: false,
        action: 'all-in',
        cards: twoCards,
      })

      // When: revealCards=true でレンダリング
      render(
        <Player
          player={cpuPlayer}
          positionClass=""
          isCurrentTurn={false}
          revealCards={true}
        />,
      )

      // Then: カードが表面表示される
      const faceUpCards = screen.getAllByTestId('card-face-up')
      expect(faceUpCards).toHaveLength(2)
      expect(screen.queryAllByTestId('card-face-down')).toHaveLength(0)
    })
  })

  describe('人間プレイヤーのカード表示', () => {
    test('ショーダウン前でもカードが表面表示される', () => {
      // Given: 人間プレイヤー、ショーダウン前
      const humanPlayer = createPlayer({
        id: 'human',
        name: 'You',
        isHuman: true,
        cards: twoCards,
      })

      // When: revealCards=false でレンダリング
      render(
        <Player
          player={humanPlayer}
          positionClass=""
          isCurrentTurn={false}
          revealCards={false}
        />,
      )

      // Then: カードが表面表示される
      const faceUpCards = screen.getAllByTestId('card-face-up')
      expect(faceUpCards).toHaveLength(2)
    })
  })

  describe('通常のCPUプレイヤーのカード表示', () => {
    test('ショーダウン前はカードが裏面表示される', () => {
      // Given: 通常のCPUプレイヤー（アクションなし）、ショーダウン前
      const cpuPlayer = createPlayer({
        id: 'cpu2',
        name: 'CPU 2',
        isHuman: false,
        action: null,
        cards: twoCards,
      })

      // When: revealCards=false でレンダリング
      render(
        <Player
          player={cpuPlayer}
          positionClass=""
          isCurrentTurn={false}
          revealCards={false}
        />,
      )

      // Then: カードが裏面表示される
      const faceDownCards = screen.getAllByTestId('card-face-down')
      expect(faceDownCards).toHaveLength(2)
    })

    test('ショーダウン時はカードが表面表示される', () => {
      // Given: 通常のCPUプレイヤー、ショーダウン
      const cpuPlayer = createPlayer({
        id: 'cpu2',
        name: 'CPU 2',
        isHuman: false,
        action: 'call',
        cards: twoCards,
      })

      // When: revealCards=true でレンダリング
      render(
        <Player
          player={cpuPlayer}
          positionClass=""
          isCurrentTurn={false}
          revealCards={true}
        />,
      )

      // Then: カードが表面表示される
      const faceUpCards = screen.getAllByTestId('card-face-up')
      expect(faceUpCards).toHaveLength(2)
    })
  })
})
