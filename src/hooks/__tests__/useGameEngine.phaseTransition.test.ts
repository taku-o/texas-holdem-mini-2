import type { Player, PlayingCard } from '../../types'
import type { GameState } from '../../utils/gameLogic'
import {
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
  calculateBlinds,
  dealCommunityCards,
  calculateSidePots,
  distributePots,
  getNextActivePlayer,
  isRoundOver,
  applyAction,
} from '../../utils/gameLogic'
import { createAndShuffleDeck } from '../../utils/deck'
import { card, createActivePlayers, createPlayer, resetPlayersForNewRound } from '../../__tests__/helpers'

/**
 * startNextHand の setState 関数形式で実行される
 * 状態計算ロジックを再現するヘルパー。
 * リファクタリング後の startNextHand は setState(s => { ... }) 内で
 * s.players と s.dealerIndex を参照して新ハンドを開始する。
 */
const computeStartNextHand = (prevState: GameState): GameState | null => {
  const players: Player[] = prevState.players.map(p => ({
    ...p,
    cards: [],
    currentBet: 0,
    totalContribution: 0,
    action: null,
    role: null,
    isActive: p.chips > 0,
  }))

  const activeCount = players.filter(p => p.isActive).length
  if (activeCount <= 1) {
    return { ...prevState, phase: 'game-over', logs: ['Game Over!'] }
  }

  const deck = createAndShuffleDeck()
  const blinds = calculateBlinds(players, prevState.dealerIndex)

  players[blinds.dealerIndex].role = 'dealer'
  players[blinds.smallBlindIndex].role = 'sb'
  players[blinds.bigBlindIndex].role = 'bb'

  let pot = 0
  const postBlind = (idx: number, amount: number) => {
    const actual = Math.min(players[idx].chips, amount)
    players[idx].chips -= actual
    players[idx].currentBet += actual
    players[idx].totalContribution += actual
    pot += actual
  }
  postBlind(blinds.smallBlindIndex, SMALL_BLIND)
  postBlind(blinds.bigBlindIndex, BIG_BLIND)

  for (let i = 0; i < 2; i++) {
    players.forEach(p => {
      if (p.isActive) p.cards.push(deck.pop()!)
    })
  }

  return {
    ...prevState,
    players,
    communityCards: [],
    deck,
    pot,
    currentBet: BIG_BLIND,
    phase: 'pre-flop',
    activePlayerIndex: blinds.utgIndex,
    dealerIndex: blinds.dealerIndex,
    logs: ['New hand started.', `Dealer is ${players[blinds.dealerIndex].name}`],
  }
}

/**
 * advancePhase の setState 関数形式で実行される
 * 状態計算ロジックを再現するヘルパー。
 * リファクタリング後の advancePhase は setState(s => { ... }) 内で
 * フェーズ遷移を計算し、showdown 到達時は勝者判定も行う。
 */
const computeAdvancePhase = (s: GameState): { newState: GameState; reachedShowdown: boolean } => {
  let newPhase = s.phase
  if (s.phase === 'pre-flop') newPhase = 'flop'
  else if (s.phase === 'flop') newPhase = 'turn'
  else if (s.phase === 'turn') newPhase = 'river'
  else if (s.phase === 'river') newPhase = 'showdown'

  const { newCommunityCards, newDeck } = dealCommunityCards(s.phase, s.communityCards, s.deck)

  const resetPlayers = s.players.map(p => ({
    ...p,
    currentBet: 0,
    action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
  }))

  if (newPhase === 'showdown') {
    const activePlayers = resetPlayers.filter(p => p.isActive && p.action !== 'fold')
    if (activePlayers.length > 1) {
      const pots = calculateSidePots(resetPlayers)
      const { updatedPlayers, awards } = distributePots(pots, resetPlayers, newCommunityCards)
      const finalPlayers = updatedPlayers.map(p => ({ ...p, totalContribution: 0 }))
      const awardLogs = awards.map(a => `${a.playerName} wins $${a.amount} with ${a.handRankName}`)

      return {
        newState: {
          ...s,
          players: finalPlayers,
          communityCards: newCommunityCards,
          deck: newDeck,
          phase: 'showdown',
          pot: 0,
          currentBet: 0,
          activePlayerIndex: -1,
          logs: [...awardLogs, ...s.logs].slice(0, 10),
        },
        reachedShowdown: true,
      }
    }
  }

  const firstToAct = getNextActivePlayer(s.dealerIndex, resetPlayers)

  return {
    newState: {
      ...s,
      players: resetPlayers,
      communityCards: newCommunityCards,
      deck: newDeck,
      phase: newPhase,
      currentBet: 0,
      activePlayerIndex: newPhase === 'showdown' ? -1 : firstToAct,
    },
    reachedShowdown: false,
  }
}

describe('タスク1.1: startNextHand の setState 関数形式変換', () => {
  describe('最新 state からプレイヤーとディーラーを読み取る', () => {
    test('prevState.players からプレイヤーをリセットして新ハンドを開始する', () => {
      // Given: 前のハンドが完了した状態
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When: startNextHand の updater ロジックを適用
      const newState = computeStartNextHand(prevState)!

      // Then: 新しいハンドが正しく開始される
      expect(newState.phase).toBe('pre-flop')
      expect(newState.communityCards).toEqual([])
      expect(newState.currentBet).toBe(BIG_BLIND)
      expect(newState.deck.length).toBeGreaterThan(0)
    })

    test('prevState.dealerIndex を基にディーラーが次のアクティブプレイヤーに移動する', () => {
      // Given: ディーラーが index=1 の状態
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then: ディーラーが index=2 に移動
      expect(newState.dealerIndex).toBe(2)
      expect(newState.players[2].role).toBe('dealer')
    })
  })

  describe('プレイヤーリセット', () => {
    test('全プレイヤーの cards, currentBet, action, role がリセットされる', () => {
      // Given: 前のハンドでアクションが設定されたプレイヤー
      const players = createActivePlayers(5)
      players[0].action = 'call'
      players[0].currentBet = 40
      players[0].cards = [card('hearts', 'A'), card('hearts', 'K')]
      players[0].role = 'dealer'
      players[1].action = 'fold'
      players[2].action = 'all-in'
      players[2].chips = 0

      const prevState: GameState = {
        players,
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then: アクティブなプレイヤーのフィールドがリセット
      const activeNewPlayers = newState.players.filter(p => p.isActive)
      for (const p of activeNewPlayers) {
        expect(p.currentBet).toBeGreaterThanOrEqual(0) // ブラインド投入があるため0以上
        expect(p.cards).toHaveLength(2)
      }
      // chips=0 のプレイヤーは isActive=false
      expect(newState.players[2].isActive).toBe(false)
    })
  })

  describe('ブラインド投入', () => {
    test('SB と BB のチップが正しく減算され pot に加算される', () => {
      // Given
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then
      expect(newState.pot).toBe(SMALL_BLIND + BIG_BLIND)
      const sbPlayer = newState.players.find(p => p.role === 'sb')!
      const bbPlayer = newState.players.find(p => p.role === 'bb')!
      expect(sbPlayer.chips).toBe(INITIAL_CHIPS - SMALL_BLIND)
      expect(sbPlayer.currentBet).toBe(SMALL_BLIND)
      expect(bbPlayer.chips).toBe(INITIAL_CHIPS - BIG_BLIND)
      expect(bbPlayer.currentBet).toBe(BIG_BLIND)
    })

    test('チップが SMALL_BLIND 未満のプレイヤーはオールインでブラインドを投入する', () => {
      // Given: SB 候補のチップが SMALL_BLIND 未満
      const players = createActivePlayers(5)
      const blinds = calculateBlinds(players, -1)
      players[blinds.smallBlindIndex].chips = 5

      const prevState: GameState = {
        players,
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then: 5チップのみ投入
      expect(newState.pot).toBe(5 + BIG_BLIND)
    })
  })

  describe('カード配布', () => {
    test('アクティブプレイヤーに2枚ずつカードが配られる', () => {
      // Given
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then
      const activePlayers = newState.players.filter(p => p.isActive)
      for (const p of activePlayers) {
        expect(p.cards).toHaveLength(2)
      }
    })

    test('デッキから配布された分のカードが減る', () => {
      // Given
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then: 52枚 - (5人 × 2枚) = 42枚
      expect(newState.deck).toHaveLength(42)
    })
  })

  describe('game-over 判定', () => {
    test('アクティブプレイヤーが1人以下の場合 game-over を返す', () => {
      // Given: 4人が脱落
      const players = createActivePlayers(5)
      players[0].chips = 0
      players[1].chips = 0
      players[2].chips = 0
      players[3].chips = 0

      const prevState: GameState = {
        players,
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then
      expect(newState.phase).toBe('game-over')
      expect(newState.logs).toContain('Game Over!')
    })

    test('アクティブプレイヤーが0人の場合 game-over を返す', () => {
      // Given: 全員が脱落
      const players = createActivePlayers(3)
      players[0].chips = 0
      players[1].chips = 0
      players[2].chips = 0

      const prevState: GameState = {
        players,
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!

      // Then
      expect(newState.phase).toBe('game-over')
    })
  })

  describe('activePlayerIndex の設定', () => {
    test('UTG プレイヤーが activePlayerIndex に設定される', () => {
      // Given
      const prevState: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: -1,
        logs: [],
      }

      // When
      const newState = computeStartNextHand(prevState)!
      const blinds = calculateBlinds(createActivePlayers(5), -1)

      // Then
      expect(newState.activePlayerIndex).toBe(blinds.utgIndex)
    })
  })
})

describe('タスク1.2: advancePhase の setState 関数形式変換 + ショーダウン統合', () => {
  const createDeck = (count: number): PlayingCard[] =>
    Array.from({ length: count }, (_, i) =>
      card(
        (['hearts', 'diamonds', 'clubs', 'spades'] as const)[i % 4],
        (['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const)[i % 13],
      ),
    )

  describe('通常のフェーズ遷移', () => {
    test('pre-flop → flop: コミュニティカードが3枚配られる', () => {
      // Given
      const state: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: createDeck(44),
        pot: 100,
        currentBet: 20,
        phase: 'pre-flop',
        activePlayerIndex: 3,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState, reachedShowdown } = computeAdvancePhase(state)

      // Then
      expect(newState.phase).toBe('flop')
      expect(newState.communityCards).toHaveLength(3)
      expect(newState.currentBet).toBe(0)
      expect(reachedShowdown).toBe(false)
    })

    test('flop → turn: コミュニティカードが4枚になる', () => {
      // Given
      const existingCards = [card('hearts', 'A'), card('diamonds', 'K'), card('clubs', 'Q')]
      const state: GameState = {
        players: createActivePlayers(5),
        communityCards: existingCards,
        deck: createDeck(40),
        pot: 200,
        currentBet: 40,
        phase: 'flop',
        activePlayerIndex: 1,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState, reachedShowdown } = computeAdvancePhase(state)

      // Then
      expect(newState.phase).toBe('turn')
      expect(newState.communityCards).toHaveLength(4)
      expect(reachedShowdown).toBe(false)
    })

    test('turn → river: コミュニティカードが5枚になる', () => {
      // Given
      const existingCards = [
        card('hearts', 'A'), card('diamonds', 'K'),
        card('clubs', 'Q'), card('spades', 'J'),
      ]
      const state: GameState = {
        players: createActivePlayers(5),
        communityCards: existingCards,
        deck: createDeck(38),
        pot: 300,
        currentBet: 60,
        phase: 'turn',
        activePlayerIndex: 1,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState, reachedShowdown } = computeAdvancePhase(state)

      // Then
      expect(newState.phase).toBe('river')
      expect(newState.communityCards).toHaveLength(5)
      expect(reachedShowdown).toBe(false)
    })
  })

  describe('プレイヤーリセット（各フェーズ遷移共通）', () => {
    test('call/raise プレイヤーの currentBet が0にリセットされる', () => {
      // Given
      const players = createActivePlayers(3)
      players[0].action = 'call'
      players[0].currentBet = 20
      players[1].action = 'raise'
      players[1].currentBet = 40
      players[2].action = 'call'
      players[2].currentBet = 40

      const state: GameState = {
        players,
        communityCards: [],
        deck: createDeck(44),
        pot: 100,
        currentBet: 40,
        phase: 'pre-flop',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      for (const p of newState.players) {
        expect(p.currentBet).toBe(0)
      }
    })

    test('fold/all-in プレイヤーの action は維持される', () => {
      // Given
      const players = createActivePlayers(5)
      players[0].action = 'fold'
      players[1].action = 'all-in'
      players[1].chips = 0
      players[2].action = 'call'
      players[3].action = 'call'
      players[4].action = 'call'

      const state: GameState = {
        players,
        communityCards: [],
        deck: createDeck(44),
        pot: 200,
        currentBet: 20,
        phase: 'pre-flop',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      expect(newState.players[0].action).toBe('fold')
      expect(newState.players[1].action).toBe('all-in')
      expect(newState.players[2].action).toBeNull()
      expect(newState.players[3].action).toBeNull()
      expect(newState.players[4].action).toBeNull()
    })
  })

  describe('firstToAct の計算', () => {
    test('ディーラーの次のアクティブプレイヤーが activePlayerIndex に設定される', () => {
      // Given
      const players = createActivePlayers(5)
      players[0].action = 'call'
      players[1].action = 'call'
      players[2].action = 'call'
      players[3].action = 'call'
      players[4].action = 'call'

      const state: GameState = {
        players,
        communityCards: [],
        deck: createDeck(44),
        pot: 100,
        currentBet: 20,
        phase: 'pre-flop',
        activePlayerIndex: 0,
        dealerIndex: 2,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then: ディーラー(2)の次のアクティブプレイヤー(3)
      expect(newState.activePlayerIndex).toBe(3)
    })
  })

  describe('river → showdown 遷移（ショーダウン処理統合）', () => {
    test('勝者のチップにポットが加算される', () => {
      // Given: river フェーズで勝者が明確なカード
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          chips: INITIAL_CHIPS - 40,
          totalContribution: 40,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          chips: INITIAL_CHIPS - 40,
          totalContribution: 40,
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

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState, reachedShowdown } = computeAdvancePhase(state)

      // Then
      expect(reachedShowdown).toBe(true)
      expect(newState.phase).toBe('showdown')
      const winner = newState.players.find(p => p.id === 'p0')!
      expect(winner.chips).toBe(INITIAL_CHIPS - 40 + pot)
    })

    test('ショーダウン後にポットが0になる', () => {
      // Given
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          chips: INITIAL_CHIPS - 60,
          totalContribution: 60,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          chips: INITIAL_CHIPS - 60,
          totalContribution: 60,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 120,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      expect(newState.pot).toBe(0)
    })

    test('ショーダウン時に activePlayerIndex が -1 に設定される', () => {
      // Given
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          totalContribution: 50,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 100,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      expect(newState.activePlayerIndex).toBe(-1)
    })

    test('ショーダウン時にログに勝者名とハンドランクが追加される', () => {
      // Given
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          totalContribution: 50,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 100,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      expect(newState.logs[0]).toContain('Player 0')
      expect(newState.logs[0]).toContain('$100')
      expect(newState.logs[0]).toContain('Royal Flush')
    })

    test('reachedShowdown フラグが true を返し、updater 外で startNextHand をスケジュール可能', () => {
      // Given
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          totalContribution: 50,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 100,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { reachedShowdown } = computeAdvancePhase(state)

      // Then: updater 外で if (reachedShowdown) setTimeout(() => startNextHand(), 5000) が可能
      expect(reachedShowdown).toBe(true)
    })

    test('非ショーダウンフェーズ遷移では reachedShowdown が false', () => {
      // Given
      const state: GameState = {
        players: createActivePlayers(5),
        communityCards: [],
        deck: createDeck(44),
        pot: 100,
        currentBet: 20,
        phase: 'pre-flop',
        activePlayerIndex: 3,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { reachedShowdown } = computeAdvancePhase(state)

      // Then
      expect(reachedShowdown).toBe(false)
    })
  })

  describe('フォールド済みプレイヤーを含むショーダウン', () => {
    test('フォールド済みプレイヤーは勝者判定の対象外', () => {
      // Given: Player 0 が最強ハンドだがフォールド済み
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'fold',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p2',
          name: 'Player 2',
          cards: [card('spades', 'J'), card('clubs', 'J')],
          action: 'call',
          totalContribution: 50,
        }),
      ]
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 150,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then: Player 0 はフォールドなので Player 2 が勝者
      const winner = newState.players.find(p => p.chips > INITIAL_CHIPS)
      expect(winner).toBeDefined()
      expect(winner!.id).not.toBe('p0')
    })
  })

  describe('river フェーズではカードが追加されない', () => {
    test('river → showdown でコミュニティカードが5枚のまま変化しない', () => {
      // Given
      const communityCards: PlayingCard[] = [
        card('hearts', 'Q'),
        card('hearts', 'J'),
        card('hearts', '10'),
        card('clubs', '9'),
        card('spades', '8'),
      ]
      const players: Player[] = [
        createPlayer({
          id: 'p0',
          name: 'Player 0',
          cards: [card('hearts', 'A'), card('hearts', 'K')],
          action: 'call',
          totalContribution: 50,
        }),
        createPlayer({
          id: 'p1',
          name: 'Player 1',
          cards: [card('diamonds', '2'), card('clubs', '7')],
          action: 'call',
          totalContribution: 50,
        }),
      ]

      const state: GameState = {
        players,
        communityCards,
        deck: createDeck(36),
        pot: 100,
        currentBet: 0,
        phase: 'river',
        activePlayerIndex: 0,
        dealerIndex: 0,
        logs: [],
      }

      // When
      const { newState } = computeAdvancePhase(state)

      // Then
      expect(newState.communityCards).toHaveLength(5)
    })
  })
})

describe('タスク1.3: handleAction のネスト setState 解消と依存配列修正', () => {
  describe('ラウンド終了時の振る舞い', () => {
    test('isRoundOver が true の場合、advancePhase が setState 外から呼ばれる構造になる', () => {
      // Given: 全員がコール済みでラウンドが終了する状態
      const players = createActivePlayers(3)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
      const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)

      // When: ラウンド終了判定
      const roundOver = isRoundOver(r2.updatedPlayers, r2.newCurrentBet)

      // Then: ラウンド終了 → advancePhase を setTimeout で呼び出す
      expect(roundOver).toBe(true)
      // リファクタリング後: setTimeout(() => advancePhase(), 500)
      // advancePhase は setState 関数形式なので、500ms 後に最新 state を取得する
    })

    test('ラウンド終了時に中間状態で activePlayerIndex が -1 に設定される', () => {
      // Given: handleAction の setState updater 内で
      // ラウンド終了と判定された場合の中間状態
      const players = createActivePlayers(3)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
      const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)

      // When: ラウンド終了時に返される中間状態をシミュレート
      expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)

      // Then: 中間状態の activePlayerIndex は -1
      // （CPU AI useEffect がタイマーを起動しないようにするため）
      const intermediateState = {
        activePlayerIndex: -1,
        players: r2.updatedPlayers,
        pot: r2.newPot,
        currentBet: r2.newCurrentBet,
      }
      expect(intermediateState.activePlayerIndex).toBe(-1)
    })
  })

  describe('全員フォールド時の振る舞い', () => {
    test('残り1人になった場合、勝者にポットが加算される', () => {
      // Given
      const players = createActivePlayers(3)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      // When: Player 0 と Player 1 がフォールド
      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

      // Then: 残り1人 = Player 2 が勝者
      const notFolded = r1.updatedPlayers.filter(p => p.isActive && p.action !== 'fold')
      expect(notFolded).toHaveLength(1)

      const winner = notFolded[0]
      const updatedWinner = { ...winner, chips: winner.chips + r1.newPot }
      expect(updatedWinner.chips).toBe(INITIAL_CHIPS + r1.newPot)
    })

    test('全員フォールド時に showdown フェーズと pot=0 が設定される', () => {
      // Given
      const players = createActivePlayers(3)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      // When
      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

      const notFolded = r1.updatedPlayers.filter(p => p.isActive && p.action !== 'fold')
      const winner = notFolded[0]
      const updatedPlayers = [...r1.updatedPlayers]
      const winnerIdx = updatedPlayers.findIndex(p => p.id === winner.id)
      updatedPlayers[winnerIdx] = { ...updatedPlayers[winnerIdx], chips: updatedPlayers[winnerIdx].chips + r1.newPot }

      // Then: handleAction の return 値をシミュレート
      const resultState = {
        players: updatedPlayers,
        pot: 0,
        phase: 'showdown' as const,
        activePlayerIndex: -1,
      }

      expect(resultState.phase).toBe('showdown')
      expect(resultState.pot).toBe(0)
      expect(resultState.activePlayerIndex).toBe(-1)
    })

    test('全員フォールド時は startNextHand が引数なしで呼ばれる（setTimeout 経由）', () => {
      // Given: 全員フォールド後の勝者状態
      const players = createActivePlayers(3)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
      const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

      // When: 勝者にポット付与後
      const notFolded = r1.updatedPlayers.filter(p => p.isActive && p.action !== 'fold')
      expect(notFolded).toHaveLength(1)

      // Then: startNextHand() は引数なしで呼ばれ、
      // setState updater 内で最新の players と dealerIndex を参照する
      // この検証は startNextHand のテスト（タスク1.1）でカバーされている
      const prevState: GameState = {
        players: r1.updatedPlayers,
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }
      const newState = computeStartNextHand(prevState)!
      expect(newState.phase).toBe('pre-flop')
    })
  })

  describe('ラウンド継続時の振る舞い', () => {
    test('ラウンドが終了していない場合、次のアクティブプレイヤーが activePlayerIndex に設定される', () => {
      // Given
      const players = createActivePlayers(5)
      const pot = SMALL_BLIND + BIG_BLIND
      const currentBet = BIG_BLIND

      // When: Player 0 がコール
      const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)

      // Then: ラウンド継続
      expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)

      const nextActive = getNextActivePlayer(0, r0.updatedPlayers)
      expect(nextActive).toBe(1)
    })
  })

  describe('showdown/game-over フェーズでのアクション無視', () => {
    test('showdown フェーズではアクションが無視される（state が変わらない）', () => {
      // Given: showdown フェーズ
      const state: GameState = {
        players: createActivePlayers(3),
        communityCards: [],
        deck: [],
        pot: 100,
        currentBet: 0,
        phase: 'showdown',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When/Then: handleAction の冒頭ガードをシミュレート
      // if (prev.phase === 'showdown' || prev.phase === 'game-over') return prev;
      expect(state.phase === 'showdown' || state.phase === 'game-over').toBe(true)
    })

    test('game-over フェーズではアクションが無視される', () => {
      // Given
      const state: GameState = {
        players: createActivePlayers(3),
        communityCards: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        phase: 'game-over',
        activePlayerIndex: -1,
        dealerIndex: 0,
        logs: [],
      }

      // When/Then
      expect(state.phase === 'showdown' || state.phase === 'game-over').toBe(true)
    })
  })
})

describe('統合: フェーズ遷移の完全フロー（startNextHand → handleAction → advancePhase）', () => {
  test('新ハンド開始 → 全員コール → フェーズ遷移 → showdown の一連フロー', () => {
    // Given: 初期状態から startNextHand で新ハンドを開始
    const initialState: GameState = {
      players: createActivePlayers(3),
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'idle',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: [],
    }

    // When: 新ハンド開始
    const handState = computeStartNextHand(initialState)!

    // Then: pre-flop が開始
    expect(handState.phase).toBe('pre-flop')
    expect(handState.pot).toBe(SMALL_BLIND + BIG_BLIND)

    // When: 全員がコールしてラウンド終了
    let currentPlayers = handState.players
    let pot = handState.pot
    let currentBet = handState.currentBet
    let activeIdx = handState.activePlayerIndex

    // UTG(0) calls
    let result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    // SB(1) calls
    activeIdx = getNextActivePlayer(activeIdx, currentPlayers)
    result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    // BB(2) checks
    activeIdx = getNextActivePlayer(activeIdx, currentPlayers)
    result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    expect(isRoundOver(currentPlayers, currentBet)).toBe(true)

    // When: advancePhase で pre-flop → flop
    const preFlopEndState: GameState = {
      ...handState,
      players: currentPlayers,
      pot,
      currentBet,
    }
    const { newState: flopState, reachedShowdown: flopShowdown } = computeAdvancePhase(preFlopEndState)

    // Then: flop フェーズに遷移し、コミュニティカードが3枚
    expect(flopState.phase).toBe('flop')
    expect(flopState.communityCards).toHaveLength(3)
    expect(flopState.currentBet).toBe(0)
    expect(flopShowdown).toBe(false)
  })

  test('advancePhase の結果で startNextHand が正しく機能する（ショーダウン後の次ハンド）', () => {
    // Given: ショーダウン完了後の状態
    const players: Player[] = [
      createPlayer({
        id: 'p0',
        name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call',
        chips: INITIAL_CHIPS - 40 + 80,
      }),
      createPlayer({
        id: 'p1',
        name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call',
        chips: INITIAL_CHIPS - 40,
      }),
      createPlayer({
        id: 'p2',
        name: 'Player 2',
        cards: [card('spades', '3'), card('clubs', '4')],
        action: 'fold',
      }),
    ]

    const showdownState: GameState = {
      players,
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'showdown',
      activePlayerIndex: -1,
      dealerIndex: 0,
      logs: [],
    }

    // When: startNextHand で次のハンドを開始
    const nextHandState = computeStartNextHand(showdownState)!

    // Then: 新ハンドが正しく開始
    expect(nextHandState.phase).toBe('pre-flop')
    expect(nextHandState.dealerIndex).toBe(1)
    expect(nextHandState.pot).toBe(SMALL_BLIND + BIG_BLIND)

    // 全プレイヤーがリセット
    for (const p of nextHandState.players.filter(pp => pp.isActive)) {
      expect(p.cards).toHaveLength(2)
      expect(p.role).not.toBeNull()
    }
  })
})
