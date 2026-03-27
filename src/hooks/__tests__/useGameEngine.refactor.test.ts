/**
 * タスク2: ゲームエンジンフックのリファクタリング
 *
 * gameLogic.ts への型・定数移動と、useGameEngine.ts からの re-export を検証する。
 * リファクタリング後の import パスが正しく機能することを保証する。
 */
import type { Player, PlayingCard } from '../../types'

// タスク2.1: GamePhase / GameState が gameLogic.ts からエクスポートされること
import type {
  GamePhase as GamePhaseFromLogic,
  GameState as GameStateFromLogic,
} from '../../utils/gameLogic'

// タスク2.1: useGameEngine.ts が re-export していること（後方互換性）
import type {
  GamePhase as GamePhaseFromHook,
  GameState as GameStateFromHook,
} from '../useGameEngine'

import {
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
  getNextActivePlayer,
  isRoundOver,
  calculateBlinds,
  applyAction,
  determineWinner,
} from '../../utils/gameLogic'
import { card, createActivePlayers, createPlayer } from '../../__tests__/helpers'

describe('タスク2.1: 型定義と定数の移動', () => {
  describe('gameLogic.ts からの GamePhase 型エクスポート', () => {
    test('GamePhase 型がゲームの全フェーズを表現できる', () => {
      const phases: GamePhaseFromLogic[] = [
        'idle',
        'pre-flop',
        'flop',
        'turn',
        'river',
        'showdown',
        'game-over',
      ]

      expect(phases).toHaveLength(7)
    })
  })

  describe('gameLogic.ts からの GameState 型エクスポート', () => {
    test('GameState 型が全フィールドを持つオブジェクトを受け入れる', () => {
      const state: GameStateFromLogic = {
        players: [],
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'idle',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      expect(state.phase).toBe('idle')
      expect(state.players).toEqual([])
      expect(state.pot).toBe(0)
    })
  })

  describe('useGameEngine.ts からの re-export（後方互換性）', () => {
    test('GamePhase 型が useGameEngine.ts からも利用可能', () => {
      const phase: GamePhaseFromHook = 'pre-flop'

      expect(phase).toBe('pre-flop')
    })

    test('GameState 型が useGameEngine.ts からも利用可能', () => {
      const state: GameStateFromHook = {
        players: [],
        communityCards: [],
        deck: [],
        pot: 100,
        currentBet: 20,
        phase: 'flop',
        activePlayerIndex: 0,
        dealerIndex: 2,
        logs: ['test'],
      }

      expect(state.pot).toBe(100)
    })
  })

  describe('gameLogic.ts の定数エクスポート', () => {
    test('INITIAL_CHIPS が正しい値', () => {
      expect(INITIAL_CHIPS).toBe(1000)
    })

    test('SMALL_BLIND が正しい値', () => {
      expect(SMALL_BLIND).toBe(10)
    })

    test('BIG_BLIND が正しい値', () => {
      expect(BIG_BLIND).toBe(20)
    })
  })
})

describe('タスク2.2: useGameEngine が gameLogic 関数を使用した場合のフロー検証', () => {
  describe('startNextHand: calculateBlinds による % 5 ハードコード解消', () => {
    test('5人プレイヤーでブラインドポジションが正しく計算される', () => {
      const players = createActivePlayers(5)

      const blinds = calculateBlinds(players, -1)

      expect(blinds.dealerIndex).toBe(0)
      expect(blinds.smallBlindIndex).toBe(1)
      expect(blinds.bigBlindIndex).toBe(2)
      expect(blinds.utgIndex).toBe(3)
    })

    test('calculateBlinds の結果でブラインドを正しく投入しポットが計算される', () => {
      const players = createActivePlayers(5)
      const blinds = calculateBlinds(players, -1)

      players[blinds.dealerIndex].role = 'dealer'
      players[blinds.smallBlindIndex].role = 'sb'
      players[blinds.bigBlindIndex].role = 'bb'

      const sbActual = Math.min(players[blinds.smallBlindIndex].chips, SMALL_BLIND)
      players[blinds.smallBlindIndex].chips -= sbActual
      players[blinds.smallBlindIndex].currentBet += sbActual

      const bbActual = Math.min(players[blinds.bigBlindIndex].chips, BIG_BLIND)
      players[blinds.bigBlindIndex].chips -= bbActual
      players[blinds.bigBlindIndex].currentBet += bbActual

      const pot = sbActual + bbActual

      expect(pot).toBe(SMALL_BLIND + BIG_BLIND)
      expect(players[blinds.smallBlindIndex].chips).toBe(INITIAL_CHIPS - SMALL_BLIND)
      expect(players[blinds.bigBlindIndex].chips).toBe(INITIAL_CHIPS - BIG_BLIND)
      expect(players[blinds.dealerIndex].role).toBe('dealer')
      expect(players[blinds.smallBlindIndex].role).toBe('sb')
      expect(players[blinds.bigBlindIndex].role).toBe('bb')
    })

    test('非アクティブプレイヤーがいる場合もブラインドポジションが正しい', () => {
      const players = createActivePlayers(5)
      players[1].isActive = false
      players[1].chips = 0

      const blinds = calculateBlinds(players, -1)

      expect(players[blinds.dealerIndex].isActive).toBe(true)
      expect(players[blinds.smallBlindIndex].isActive).toBe(true)
      expect(players[blinds.bigBlindIndex].isActive).toBe(true)
      expect(players[blinds.utgIndex].isActive).toBe(true)
    })

    test('アクティブプレイヤーが2人以下の場合は game-over にすべきフローの前段', () => {
      const players = createActivePlayers(5)
      players[0].isActive = false
      players[1].isActive = false
      players[2].isActive = false
      players[3].isActive = false

      const activeCount = players.filter(p => p.isActive).length
      expect(activeCount).toBe(1)
      expect(activeCount <= 1).toBe(true)
    })
  })

  describe('handleAction: applyAction による純粋計算の置き換え', () => {
    test('fold アクションが正しく適用される', () => {
      const players = createActivePlayers(5)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const result = applyAction(players, 3, 'fold', 0, pot, currentBet)

      expect(result.updatedPlayers[3].action).toBe('fold')
      expect(result.newPot).toBe(pot)
      expect(result.logMessage).toContain('fold')
    })

    test('call アクションが正しく適用される', () => {
      const players = createActivePlayers(5)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const result = applyAction(players, 3, 'call', 0, pot, currentBet)

      expect(result.updatedPlayers[3].chips).toBe(INITIAL_CHIPS - BIG_BLIND)
      expect(result.updatedPlayers[3].currentBet).toBe(BIG_BLIND)
      expect(result.updatedPlayers[3].action).toBe('call')
      expect(result.newPot).toBe(pot + BIG_BLIND)
    })

    test('raise アクションが正しく適用される', () => {
      const players = createActivePlayers(5)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const result = applyAction(players, 3, 'raise', 40, pot, currentBet)

      expect(result.updatedPlayers[3].currentBet).toBe(40)
      expect(result.updatedPlayers[3].action).toBe('raise')
      expect(result.newCurrentBet).toBe(40)
      expect(result.newPot).toBe(pot + 40)
    })

    test('全員フォールドで残り1人になった場合の判定', () => {
      const players = createActivePlayers(3)
      const currentBet = BIG_BLIND
      const pot = BIG_BLIND

      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

      const notFolded = r1.updatedPlayers.filter(p => p.isActive && p.action !== 'fold')
      expect(notFolded).toHaveLength(1)
      expect(notFolded[0].id).toBe('p2')
    })

    test('全員フォールド時の勝者にポットが付与される', () => {
      const players = createActivePlayers(3)
      const currentBet = BIG_BLIND
      const pot = SMALL_BLIND + BIG_BLIND

      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

      const notFolded = r1.updatedPlayers.filter(p => p.isActive && p.action !== 'fold')
      const winner = notFolded[0]

      const updatedWinner = { ...winner, chips: winner.chips + r1.newPot }
      expect(updatedWinner.chips).toBe(INITIAL_CHIPS + r1.newPot)
    })
  })

  describe('handleAction: isRoundOver によるラウンド終了判定', () => {
    test('全員アクション済みでベットが揃った場合ラウンド終了', () => {
      const players = createActivePlayers(3)
      const currentBet = BIG_BLIND
      const pot = BIG_BLIND

      const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
      const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)

      expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
    })

    test('未アクションのプレイヤーがいる場合ラウンド続行', () => {
      const players = createActivePlayers(3)
      const currentBet = BIG_BLIND
      const pot = BIG_BLIND

      const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)

      expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)
    })
  })

  describe('handleAction: getNextActivePlayer による次プレイヤー決定', () => {
    test('フォールド済みプレイヤーをスキップして次のアクティブプレイヤーを返す', () => {
      const players = createActivePlayers(5)
      const currentBet = BIG_BLIND
      const pot = BIG_BLIND

      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const nextActive = getNextActivePlayer(0, r0.updatedPlayers)

      expect(nextActive).toBe(1)
      expect(r0.updatedPlayers[nextActive].action).toBeNull()
    })

    test('オールインプレイヤーをスキップして次のアクティブプレイヤーを返す', () => {
      const players = createActivePlayers(5)
      players[1].chips = 5
      const currentBet = BIG_BLIND
      const pot = BIG_BLIND

      const r0 = applyAction(players, 1, 'call', 0, pot, currentBet)
      expect(r0.updatedPlayers[1].chips).toBe(0)
      expect(r0.updatedPlayers[1].action).toBe('all-in')

      const nextActive = getNextActivePlayer(1, r0.updatedPlayers)
      expect(nextActive).toBe(2)
    })
  })

  describe('advancePhase: getNextActivePlayer による firstToAct 計算', () => {
    test('ディーラーの次のアクティブプレイヤーが firstToAct になる', () => {
      const players = createActivePlayers(5)
      const dealerIndex = 2

      // ラウンド完了後のリセットをシミュレート（advancePhase 相当）
      players.forEach(p => { p.action = 'call'; p.currentBet = 20 })

      const resetPlayers = players.map(p => ({
        ...p,
        currentBet: 0,
        action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
      }))

      const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)

      expect(firstToAct).toBe(3)
      expect(resetPlayers[firstToAct].action).toBeNull()
    })

    test('ディーラーの次がフォールド済みの場合、さらに次のプレイヤーが firstToAct', () => {
      const players = createActivePlayers(5)
      const dealerIndex = 0

      players[0].action = 'call'
      players[1].action = 'fold'
      players[2].action = 'call'
      players[3].action = 'call'
      players[4].action = 'fold'

      const resetPlayers = players.map(p => ({
        ...p,
        currentBet: 0,
        action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
      }))

      const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)

      expect(firstToAct).toBe(2)
    })

    test('ディーラーの次がオールイン（chips=0）の場合スキップする', () => {
      const players = createActivePlayers(5)
      const dealerIndex = 0

      players[1].action = 'all-in'
      players[1].chips = 0
      players[2].action = 'call'
      players[3].action = 'call'
      players[4].action = 'call'

      const resetPlayers = players.map(p => ({
        ...p,
        currentBet: 0,
        action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
      }))

      const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)

      expect(firstToAct).toBe(2)
    })
  })

  describe('ショーダウン: determineWinner による勝者判定', () => {
    test('ショーダウンで最強ハンドのプレイヤーが勝者になる', () => {
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const result = determineWinner(players, communityCards)

      expect(result.winnerId).toBe('p0')
      expect(result.winnerName).toBe('Player 0')
      expect(result.handRankName).toBe('Royal Flush')
    })

    test('勝者にポットが正しく付与される', () => {
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          chips: INITIAL_CHIPS - 40,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          chips: INITIAL_CHIPS - 40,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]
      const pot = 80

      const result = determineWinner(players, communityCards)

      const updatedPlayers = [...players]
      const wpIdx = updatedPlayers.findIndex(p => p.id === result.winnerId)
      updatedPlayers[wpIdx] = {
        ...updatedPlayers[wpIdx],
        chips: updatedPlayers[wpIdx].chips + pot,
      }

      expect(updatedPlayers[wpIdx].chips).toBe(INITIAL_CHIPS - 40 + pot)
    })

    test('フォールド済みプレイヤーは評価対象外', () => {
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'fold',
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const result = determineWinner(players, communityCards)

      expect(result.winnerId).toBe('p1')
    })
  })
})

describe('タスク2.2: evaluateHand の直接 import 削除の検証', () => {
  test('determineWinner が内部で evaluateHand を使用しており、外部から直接呼ぶ必要がない', () => {
    const players: Player[] = [
      createPlayer({
        id: 'p0',
        name: 'Player 0',
        cards: [card('hearts', 'J'), card('diamonds', 'J')],
      }),
      createPlayer({
        id: 'p1',
        name: 'Player 1',
        cards: [card('clubs', '2'), card('spades', '3')],
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('clubs', '8'),
      card('spades', '5'),
      card('hearts', '9'),
    ]

    const result = determineWinner(players, communityCards)

    expect(result.handRankName).toBeTruthy()
    expect(result.winnerId).toBe('p0')
  })
})

describe('タスク2.3: 外部 API インターフェースの維持', () => {
  describe('useGameEngine フックのエクスポート', () => {
    test('useGameEngine が名前付きエクスポートとして存在する', async () => {
      const mod = await import('../useGameEngine')

      expect(mod.useGameEngine).toBeDefined()
      expect(typeof mod.useGameEngine).toBe('function')
    })
  })

  describe('型の re-export 確認', () => {
    test('GamePhase と GameState がどちらのモジュールからも同等の型として使える', () => {
      // 型互換性の検証: gameLogic からの型で useGameEngine の型に代入可能
      const phaseFromLogic: GamePhaseFromLogic = 'flop'
      const phaseFromHook: GamePhaseFromHook = phaseFromLogic

      expect(phaseFromHook).toBe('flop')

      const stateFromLogic: GameStateFromLogic = {
        players: [],
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'idle',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }
      const stateFromHook: GameStateFromHook = stateFromLogic

      expect(stateFromHook.phase).toBe('idle')
    })
  })
})

describe('コード品質: What コメント禁止', () => {
  test('useGameEngine.ts に What コメント（// で始まる行コメント）が存在しない（ディレクティブコメントは除外）', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(__dirname, '../useGameEngine.ts')
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    const whatCommentLines = lines
      .map((line, i) => ({ line: line.trim(), num: i + 1 }))
      .filter(({ line }) =>
        /^\/\/\s/.test(line) &&
        !/^\/\/\s*(eslint|TODO|FIXME|@ts-|istanbul)/.test(line)
      )

    expect(whatCommentLines).toEqual([])
  })
})
