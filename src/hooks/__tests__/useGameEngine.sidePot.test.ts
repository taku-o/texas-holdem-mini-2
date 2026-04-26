import type { Player, PlayingCard } from '../../types'
import type { GameState } from '../../utils/gameLogic'
import {
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
  calculateBlinds,
  dealCommunityCards,
  getNextActivePlayer,
  isRoundOver,
  applyAction,
  calculateSidePots,
  distributePots,
} from '../../utils/gameLogic'
import { createAndShuffleDeck } from '../../utils/deck'
import { card, createActivePlayers, createPlayer } from '../../__tests__/helpers'

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

      const logs = awards.map(a => `${a.playerName} wins $${a.amount} with ${a.handRankName}`)

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
          logs: [...logs, ...s.logs].slice(0, 10),
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

const computeHandleActionAllFold = (
  prev: GameState,
  action: 'fold' | 'call' | 'raise',
  amount: number,
): GameState | null => {
  const pIndex = prev.activePlayerIndex
  const result = applyAction(prev.players, pIndex, action, amount, prev.pot, prev.currentBet)
  const { updatedPlayers: newPlayers, newPot, logMessage } = result

  const notFolded = newPlayers.filter(p => p.isActive && p.action !== 'fold')
  if (notFolded.length !== 1) return null

  const winner = notFolded[0]
  const updatedWinner = { ...winner, chips: winner.chips + newPot }
  const finalPlayers = newPlayers.map(p =>
    p.id === winner.id
      ? { ...updatedWinner, totalContribution: 0 }
      : { ...p, totalContribution: 0 },
  )

  return {
    ...prev,
    players: finalPlayers,
    pot: 0,
    phase: 'showdown',
    activePlayerIndex: -1,
    logs: [logMessage, `${updatedWinner.name} wins $${newPot} (others folded)!`, ...prev.logs].slice(0, 10),
  }
}

describe('startNextHand で totalContribution を 0 に初期化する', () => {
  test('新ハンド開始時に全プレイヤーの totalContribution が 0 にリセットされる', () => {
    // Given: 前のハンドで totalContribution が残っている
    const players = createActivePlayers(5)
    players[0].totalContribution = 100
    players[1].totalContribution = 200
    players[2].totalContribution = 50

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

    // Then: ブラインド投入分のみが totalContribution に反映される
    for (const p of newState.players) {
      if (p.role === 'sb') {
        expect(p.totalContribution).toBe(SMALL_BLIND)
      } else if (p.role === 'bb') {
        expect(p.totalContribution).toBe(BIG_BLIND)
      } else {
        expect(p.totalContribution).toBe(0)
      }
    }
  })

  test('chips=0 で isActive=false のプレイヤーも totalContribution が 0 にリセットされる', () => {
    // Given
    const players = createActivePlayers(5)
    players[0].chips = 0
    players[0].totalContribution = 150

    const prevState: GameState = {
      players,
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

    // Then
    expect(newState.players[0].isActive).toBe(false)
    expect(newState.players[0].totalContribution).toBe(0)
  })
})

describe('postBlind で totalContribution を加算する', () => {
  test('SB の totalContribution に SMALL_BLIND が加算される', () => {
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
    const sbPlayer = newState.players.find(p => p.role === 'sb')!
    expect(sbPlayer.totalContribution).toBe(SMALL_BLIND)
  })

  test('BB の totalContribution に BIG_BLIND が加算される', () => {
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
    const bbPlayer = newState.players.find(p => p.role === 'bb')!
    expect(bbPlayer.totalContribution).toBe(BIG_BLIND)
  })

  test('チップが SMALL_BLIND 未満のプレイヤーは残チップ分のみ totalContribution に加算される', () => {
    // Given
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

    // Then
    const sbPlayer = newState.players[blinds.smallBlindIndex]
    expect(sbPlayer.totalContribution).toBe(5)
  })

  test('不変条件: postBlind 後に pot === sum(totalContribution) が成り立つ', () => {
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
    const totalContribution = newState.players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(newState.pot).toBe(totalContribution)
  })
})

describe('advancePhase の showdown 分岐を複数ポット分配に書き換える', () => {
  const createDeck = (count: number): PlayingCard[] =>
    Array.from({ length: count }, (_, i) =>
      card(
        (['hearts', 'diamonds', 'clubs', 'spades'] as const)[i % 4],
        (['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const)[i % 13],
      ),
    )

  test('showdown で calculateSidePots → distributePots による分配が行われる', () => {
    // Given: 全員同額ベットのシンプルなケース
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10'),
      card('clubs', '9'), card('spades', '8'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 200,
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
    expect(newState.pot).toBe(0)
    const winner = newState.players.find(p => p.id === 'p0')!
    expect(winner.chips).toBe(INITIAL_CHIPS - 100 + 200)
  })

  test('オールインプレイヤーを含む showdown でサイドポットが正しく分配される', () => {
    // Given: p0 が少額オールイン、p1/p2 が残り
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('spades', 'A'), card('hearts', 'A')],
        action: 'all-in', chips: 0, totalContribution: 50,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('spades', 'K'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p2', name: 'Player 2',
        cards: [card('spades', '4'), card('hearts', '6')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('clubs', '2'), card('diamonds', '3'), card('spades', '8'),
      card('clubs', 'J'), card('diamonds', '9'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 250,
      currentBet: 0,
      phase: 'river',
      activePlayerIndex: 0,
      dealerIndex: 0,
      logs: [],
    }

    // When
    const { newState, reachedShowdown } = computeAdvancePhase(state)

    // Then: p0 がメインポット(150)を獲得、p1 がサイドポット(100)を獲得
    expect(reachedShowdown).toBe(true)
    expect(newState.pot).toBe(0)
    expect(newState.players.find(p => p.id === 'p0')!.chips).toBe(150)
    expect(newState.players.find(p => p.id === 'p1')!.chips).toBe(INITIAL_CHIPS - 100 + 100)
  })

  test('showdown 後に全プレイヤーの totalContribution が 0 にリセットされる', () => {
    // Given
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10'),
      card('clubs', '9'), card('spades', '8'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 200,
      currentBet: 0,
      phase: 'river',
      activePlayerIndex: 0,
      dealerIndex: 0,
      logs: [],
    }

    // When
    const { newState } = computeAdvancePhase(state)

    // Then
    for (const p of newState.players) {
      expect(p.totalContribution).toBe(0)
    }
  })

  test('showdown ログに各 award の情報が含まれる', () => {
    // Given
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10'),
      card('clubs', '9'), card('spades', '8'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 200,
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
    expect(newState.logs[0]).toContain('$200')
    expect(newState.logs[0]).toContain('Royal Flush')
  })

  test('チップ保存則: showdown 前後でチップ総額が一致する', () => {
    // Given
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('spades', 'A'), card('hearts', 'A')],
        action: 'all-in', chips: 0, totalContribution: 50,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('spades', 'K'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p2', name: 'Player 2',
        cards: [card('spades', '4'), card('hearts', '6')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('clubs', '2'), card('diamonds', '3'), card('spades', '8'),
      card('clubs', 'J'), card('diamonds', '9'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 250,
      currentBet: 0,
      phase: 'river',
      activePlayerIndex: 0,
      dealerIndex: 0,
      logs: [],
    }

    const totalChipsBefore = state.players.reduce((s, p) => s + p.chips, 0) + state.pot

    // When
    const { newState } = computeAdvancePhase(state)

    // Then
    const totalChipsAfter = newState.players.reduce((s, p) => s + p.chips, 0) + newState.pot
    expect(totalChipsAfter).toBe(totalChipsBefore)
  })
})

describe('handleAction の全員フォールド経路に totalContribution 0 リセットを追加する', () => {
  test('全員フォールド後に全プレイヤーの totalContribution が 0 にリセットされる', () => {
    // Given: 3人のプレイヤーでブラインド投入後の状態
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    players[blinds.smallBlindIndex].chips -= SMALL_BLIND
    players[blinds.smallBlindIndex].currentBet = SMALL_BLIND
    players[blinds.smallBlindIndex].totalContribution = SMALL_BLIND
    players[blinds.bigBlindIndex].chips -= BIG_BLIND
    players[blinds.bigBlindIndex].currentBet = BIG_BLIND
    players[blinds.bigBlindIndex].totalContribution = BIG_BLIND

    const state: GameState = {
      players,
      communityCards: [],
      deck: [],
      pot: SMALL_BLIND + BIG_BLIND,
      currentBet: BIG_BLIND,
      phase: 'pre-flop',
      activePlayerIndex: blinds.utgIndex,
      dealerIndex: blinds.dealerIndex,
      logs: [],
    }

    // When: UTG がフォールド
    const r0 = applyAction(state.players, state.activePlayerIndex, 'fold', 0, state.pot, state.currentBet)
    const stateAfterFold1: GameState = {
      ...state,
      players: r0.updatedPlayers,
      pot: r0.newPot,
      currentBet: r0.newCurrentBet,
      activePlayerIndex: blinds.smallBlindIndex,
    }

    // SB がフォールド → 全員フォールド
    const resultState = computeHandleActionAllFold(stateAfterFold1, 'fold', 0)!

    // Then
    expect(resultState).not.toBeNull()
    for (const p of resultState.players) {
      expect(p.totalContribution).toBe(0)
    }
  })

  test('全員フォールド後に pot が 0 になる', () => {
    // Given
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    players[blinds.smallBlindIndex].chips -= SMALL_BLIND
    players[blinds.smallBlindIndex].currentBet = SMALL_BLIND
    players[blinds.smallBlindIndex].totalContribution = SMALL_BLIND
    players[blinds.bigBlindIndex].chips -= BIG_BLIND
    players[blinds.bigBlindIndex].currentBet = BIG_BLIND
    players[blinds.bigBlindIndex].totalContribution = BIG_BLIND

    const state: GameState = {
      players,
      communityCards: [],
      deck: [],
      pot: SMALL_BLIND + BIG_BLIND,
      currentBet: BIG_BLIND,
      phase: 'pre-flop',
      activePlayerIndex: blinds.utgIndex,
      dealerIndex: blinds.dealerIndex,
      logs: [],
    }

    // When
    const r0 = applyAction(state.players, state.activePlayerIndex, 'fold', 0, state.pot, state.currentBet)
    const stateAfterFold1: GameState = {
      ...state,
      players: r0.updatedPlayers,
      pot: r0.newPot,
      currentBet: r0.newCurrentBet,
      activePlayerIndex: blinds.smallBlindIndex,
    }
    const resultState = computeHandleActionAllFold(stateAfterFold1, 'fold', 0)!

    // Then
    expect(resultState.pot).toBe(0)
    expect(resultState.phase).toBe('showdown')
  })
})

describe('統合: useGameEngine サイドポットフロー', () => {
  const createDeck = (count: number): PlayingCard[] =>
    Array.from({ length: count }, (_, i) =>
      card(
        (['hearts', 'diamonds', 'clubs', 'spades'] as const)[i % 4],
        (['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const)[i % 13],
      ),
    )

  test('postBlind + applyAction で totalContribution が累積する', () => {
    // Given: startNextHand でブラインド投入後
    const initialState: GameState = {
      players: createActivePlayers(3),
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'showdown',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: [],
    }
    const handState = computeStartNextHand(initialState)!
    const blinds = calculateBlinds(createActivePlayers(3), -1)

    // When: UTG がコール
    const result = applyAction(
      handState.players, handState.activePlayerIndex, 'call', 0,
      handState.pot, handState.currentBet,
    )

    // Then: UTG の totalContribution が BIG_BLIND（コール額）になる
    const utgPlayer = result.updatedPlayers[handState.activePlayerIndex]
    expect(utgPlayer.totalContribution).toBe(BIG_BLIND)

    // 不変条件: pot === sum(totalContribution)
    const totalContribution = result.updatedPlayers.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(result.newPot).toBe(totalContribution)
  })

  test('複数ラウンドにわたる totalContribution 保持検証', () => {
    // Given: 新ハンド開始
    const initialState: GameState = {
      players: createActivePlayers(3),
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'showdown',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: [],
    }
    const handState = computeStartNextHand(initialState)!

    // When: プリフロップで全員コール
    let currentPlayers = handState.players
    let pot = handState.pot
    let currentBet = handState.currentBet
    let activeIdx = handState.activePlayerIndex

    // UTG calls
    let result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    // SB calls
    activeIdx = getNextActivePlayer(activeIdx, currentPlayers)
    result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    // BB checks
    activeIdx = getNextActivePlayer(activeIdx, currentPlayers)
    result = applyAction(currentPlayers, activeIdx, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet

    expect(isRoundOver(currentPlayers, currentBet)).toBe(true)

    // Then: totalContribution はフェーズ遷移後も保持される
    const preFlopEndState: GameState = {
      ...handState,
      players: currentPlayers,
      pot,
      currentBet,
    }
    const { newState: flopState } = computeAdvancePhase(preFlopEndState)

    // フェーズ遷移後も totalContribution は保持（showdown でないため）
    for (const p of flopState.players) {
      expect(p.totalContribution).toBe(BIG_BLIND)
    }

    // 不変条件: pot === sum(totalContribution)
    const totalContribution = flopState.players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(flopState.pot).toBe(totalContribution)
  })

  test('オールインケースの showdown 分配フロー: 勝者 chips 増加 = 各ポット合算', () => {
    // Given: p0(50), p1(100), p2(100) のコントリビューション
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('spades', 'A'), card('hearts', 'A')],
        action: 'all-in', chips: 0, totalContribution: 50,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('spades', 'K'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p2', name: 'Player 2',
        cards: [card('spades', '4'), card('hearts', '6')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('clubs', '2'), card('diamonds', '3'), card('spades', '8'),
      card('clubs', 'J'), card('diamonds', '9'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 250,
      currentBet: 0,
      phase: 'river',
      activePlayerIndex: 0,
      dealerIndex: 0,
      logs: [],
    }

    // When
    const { newState } = computeAdvancePhase(state)

    // Then: p0 がメインポット(150)を獲得、p1 がサイドポット(100)を獲得
    const p0 = newState.players.find(p => p.id === 'p0')!
    const p1 = newState.players.find(p => p.id === 'p1')!
    expect(p0.chips).toBe(150)
    expect(p1.chips).toBe(INITIAL_CHIPS - 100 + 100)
  })

  test('ハンド全体のチップ保存則: 全プレイヤーのチップ合計が不変', () => {
    // Given: 初期チップ合計
    const initialState: GameState = {
      players: createActivePlayers(3),
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'showdown',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: [],
    }
    const totalInitialChips = initialState.players.reduce((s, p) => s + p.chips, 0)

    // When: ハンド開始
    const handState = computeStartNextHand(initialState)!

    // Then: ブラインド投入後もチップ総額は保存
    const totalAfterBlinds = handState.players.reduce((s, p) => s + p.chips, 0) + handState.pot
    expect(totalAfterBlinds).toBe(totalInitialChips)
  })

  test('showdown 経路 (advancePhase) で totalContribution === 0 かつ pot === 0', () => {
    // Given
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
      createPlayer({
        id: 'p1', name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call', chips: INITIAL_CHIPS - 100, totalContribution: 100,
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '10'),
      card('clubs', '9'), card('spades', '8'),
    ]

    const state: GameState = {
      players,
      communityCards,
      deck: createDeck(36),
      pot: 200,
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
    const totalContribution = newState.players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(totalContribution).toBe(0)
  })

  test('全員フォールド経路 (handleAction) で totalContribution === 0 かつ pot === 0', () => {
    // Given
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    players[blinds.smallBlindIndex].chips -= SMALL_BLIND
    players[blinds.smallBlindIndex].currentBet = SMALL_BLIND
    players[blinds.smallBlindIndex].totalContribution = SMALL_BLIND
    players[blinds.bigBlindIndex].chips -= BIG_BLIND
    players[blinds.bigBlindIndex].currentBet = BIG_BLIND
    players[blinds.bigBlindIndex].totalContribution = BIG_BLIND

    const state: GameState = {
      players,
      communityCards: [],
      deck: [],
      pot: SMALL_BLIND + BIG_BLIND,
      currentBet: BIG_BLIND,
      phase: 'pre-flop',
      activePlayerIndex: blinds.utgIndex,
      dealerIndex: blinds.dealerIndex,
      logs: [],
    }

    // When: UTG fold → SB fold
    const r0 = applyAction(state.players, state.activePlayerIndex, 'fold', 0, state.pot, state.currentBet)
    const stateAfterFold1: GameState = {
      ...state,
      players: r0.updatedPlayers,
      pot: r0.newPot,
      currentBet: r0.newCurrentBet,
      activePlayerIndex: blinds.smallBlindIndex,
    }
    const resultState = computeHandleActionAllFold(stateAfterFold1, 'fold', 0)!

    // Then
    expect(resultState.pot).toBe(0)
    const totalContribution = resultState.players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(totalContribution).toBe(0)
  })

  test('不変条件: 複数時点で pot === sum(totalContribution) が成立する', () => {
    // Given
    const initialState: GameState = {
      players: createActivePlayers(3),
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'showdown',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: [],
    }

    // 時点1: ブラインド投入後
    const handState = computeStartNextHand(initialState)!
    const tc1 = handState.players.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(handState.pot).toBe(tc1)

    // 時点2: UTG コール後
    const r0 = applyAction(
      handState.players, handState.activePlayerIndex, 'call', 0,
      handState.pot, handState.currentBet,
    )
    const tc2 = r0.updatedPlayers.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(r0.newPot).toBe(tc2)

    // 時点3: SB コール後
    const nextIdx = getNextActivePlayer(handState.activePlayerIndex, r0.updatedPlayers)
    const r1 = applyAction(r0.updatedPlayers, nextIdx, 'call', 0, r0.newPot, r0.newCurrentBet)
    const tc3 = r1.updatedPlayers.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(r1.newPot).toBe(tc3)
  })
})
