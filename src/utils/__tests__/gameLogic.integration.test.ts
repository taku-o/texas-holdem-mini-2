/**
 * タスク2: ゲームエンジンフックのリファクタリング — 統合テスト
 *
 * useGameEngine がリファクタリング後に gameLogic.ts の関数を
 * 組み合わせて使う「ゲームフロー」を純粋関数レベルで検証する。
 */
import type { Player, PlayingCard } from '../../types'
import {
  getNextActivePlayer,
  isRoundOver,
  calculateBlinds,
  applyAction,
  determineWinner,
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
} from '../gameLogic'
import { card, createActivePlayers, createPlayer } from '../../__tests__/helpers'

/**
 * ブラインド投入をシミュレートする。
 * useGameEngine.startNextHand 内の postBlind ロジックと同等。
 */
const postBlind = (players: Player[], index: number, amount: number): number => {
  const actual = Math.min(players[index].chips, amount)
  players[index].chips -= actual
  players[index].currentBet += actual
  return actual
}

describe('ゲームフロー統合: calculateBlinds → ブラインド投入', () => {
  test('calculateBlinds の結果でブラインドを正しく投入できる', () => {
    const players = createActivePlayers(5)
    const blinds = calculateBlinds(players, -1)

    players[blinds.dealerIndex].role = 'dealer'
    players[blinds.smallBlindIndex].role = 'sb'
    players[blinds.bigBlindIndex].role = 'bb'

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    expect(pot).toBe(SMALL_BLIND + BIG_BLIND)
    expect(players[blinds.smallBlindIndex].chips).toBe(INITIAL_CHIPS - SMALL_BLIND)
    expect(players[blinds.smallBlindIndex].currentBet).toBe(SMALL_BLIND)
    expect(players[blinds.bigBlindIndex].chips).toBe(INITIAL_CHIPS - BIG_BLIND)
    expect(players[blinds.bigBlindIndex].currentBet).toBe(BIG_BLIND)
    expect(players[blinds.dealerIndex].role).toBe('dealer')
  })

  test('UTGプレイヤーが最初のアクティブプレイヤーとして正しい', () => {
    const players = createActivePlayers(5)
    const blinds = calculateBlinds(players, -1)

    expect(blinds.utgIndex).not.toBe(blinds.dealerIndex)
    expect(blinds.utgIndex).not.toBe(blinds.smallBlindIndex)
    expect(blinds.utgIndex).not.toBe(blinds.bigBlindIndex)
    expect(players[blinds.utgIndex].isActive).toBe(true)
  })

  test('非アクティブプレイヤーがいる場合でもブラインド投入が正しく動作する', () => {
    const players = createActivePlayers(5)
    players[1].isActive = false
    players[1].chips = 0

    const blinds = calculateBlinds(players, -1)

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    expect(pot).toBe(SMALL_BLIND + BIG_BLIND)
    expect(blinds.smallBlindIndex).not.toBe(1)
    expect(blinds.bigBlindIndex).not.toBe(1)
  })

  test('チップがSMALL_BLIND未満のプレイヤーはオールインでブラインド投入する', () => {
    const players = createActivePlayers(5)
    const blinds = calculateBlinds(players, -1)
    players[blinds.smallBlindIndex].chips = 5

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    expect(players[blinds.smallBlindIndex].chips).toBe(0)
    expect(players[blinds.smallBlindIndex].currentBet).toBe(5)
    expect(pot).toBe(5 + BIG_BLIND)
  })
})

describe('ゲームフロー統合: applyAction → isRoundOver → getNextActivePlayer', () => {
  test('全員コール後にラウンドが終了する', () => {
    const players = createActivePlayers(3)
    const currentBet = BIG_BLIND
    let pot = BIG_BLIND

    // Player 0 calls
    const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
    expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)

    // Player 1 calls
    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(false)

    // Player 2 calls
    const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)
    expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
  })

  test('レイズ後は他プレイヤーが再度アクションするまでラウンド続行', () => {
    const players = createActivePlayers(3)
    const currentBet = BIG_BLIND
    let pot = BIG_BLIND

    // Player 0 raises
    const r0 = applyAction(players, 0, 'raise', 40, pot, currentBet)
    expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)

    // Player 1 calls the raise
    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(false)

    // Player 2 calls the raise
    const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)
    expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
  })

  test('getNextActivePlayer でフォールド済みプレイヤーをスキップしてアクション順が進む', () => {
    const players = createActivePlayers(5)
    const currentBet = BIG_BLIND
    let pot = BIG_BLIND

    // Player 0 folds
    const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)

    // 次のアクティブプレイヤーはフォールド済みの0をスキップ
    const next = getNextActivePlayer(0, r0.updatedPlayers)
    expect(next).toBe(1)
    expect(r0.updatedPlayers[next].action).toBeNull()
  })

  test('全員フォールドで残り1人になるとラウンド終了', () => {
    const players = createActivePlayers(3)
    const currentBet = BIG_BLIND
    let pot = BIG_BLIND

    // Player 0 folds
    const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
    // Player 1 folds
    const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(true)
  })

  test('オールインプレイヤーを含むラウンド終了判定が正しい', () => {
    const players = createActivePlayers(3)
    players[0].chips = 10
    const currentBet = BIG_BLIND
    let pot = BIG_BLIND

    // Player 0 calls but goes all-in (chips < currentBet)
    const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
    expect(r0.updatedPlayers[0].action).toBe('all-in')
    expect(r0.updatedPlayers[0].chips).toBe(0)

    // Player 1 calls
    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)

    // Player 2 calls
    const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)

    expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
  })
})

describe('ゲームフロー統合: ベッティングラウンド間のプレイヤーリセット', () => {
  /**
   * advancePhase でプレイヤーの currentBet と action をリセットし、
   * getNextActivePlayer で firstToAct を決定するフローのテスト。
   */
  test('ラウンド間でプレイヤーをリセットした後に getNextActivePlayer が正しく動作する', () => {
    const players = createActivePlayers(5)
    const dealerIndex = 0

    // ラウンド終了後のリセットをシミュレート（advancePhase相当）
    players[0].action = 'call'
    players[0].currentBet = 20
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'fold'
    players[2].currentBet = 0
    players[3].action = 'call'
    players[3].currentBet = 20
    players[4].action = 'all-in'
    players[4].currentBet = 10
    players[4].chips = 0

    const resetPlayers = players.map(p => ({
      ...p,
      currentBet: 0,
      action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
    }))

    // ディーラーの次のアクティブプレイヤーが firstToAct
    const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)

    // Player 1 はリセットされて action=null, Player 2 は fold のまま, Player 4 は all-in (chips=0)
    expect(firstToAct).toBe(1)
    expect(resetPlayers[firstToAct].action).toBeNull()
    expect(resetPlayers[firstToAct].currentBet).toBe(0)
  })

  test('フォールド・オールインはリセットされない', () => {
    const players = createActivePlayers(3)
    players[0].action = 'fold'
    players[1].action = 'all-in'
    players[1].chips = 0
    players[2].action = 'raise'
    players[2].currentBet = 40

    const resetPlayers = players.map(p => ({
      ...p,
      currentBet: 0,
      action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
    }))

    expect(resetPlayers[0].action).toBe('fold')
    expect(resetPlayers[1].action).toBe('all-in')
    expect(resetPlayers[2].action).toBeNull()
  })
})

describe('ゲームフロー統合: ショーダウン → determineWinner', () => {
  test('ショーダウンで勝者が正しく決定されチップが付与される', () => {
    const players: Player[] = [
      createPlayer({
        id: 'p0',
        name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
        action: 'call',
        chips: INITIAL_CHIPS - 40,
        currentBet: 40,
      }),
      createPlayer({
        id: 'p1',
        name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
        action: 'call',
        chips: INITIAL_CHIPS - 40,
        currentBet: 40,
      }),
      createPlayer({
        id: 'p2',
        name: 'Player 2',
        cards: [card('spades', '3'), card('clubs', '4')],
        action: 'fold',
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'),
      card('hearts', 'J'),
      card('hearts', '10'),
      card('clubs', '9'),
      card('spades', '8'),
    ]
    const pot = 120

    const result = determineWinner(players, communityCards)

    // チップ付与のシミュレート（useGameEngine.ts のショーダウン処理相当）
    const updatedPlayers = [...players]
    const winnerIdx = updatedPlayers.findIndex(p => p.id === result.winnerId)
    updatedPlayers[winnerIdx] = {
      ...updatedPlayers[winnerIdx],
      chips: updatedPlayers[winnerIdx].chips + pot,
    }

    expect(result.winnerId).toBe('p0')
    expect(updatedPlayers[winnerIdx].chips).toBe(INITIAL_CHIPS - 40 + pot)
    expect(result.handRankName).toBeTruthy()
  })

  test('フォールド済みプレイヤーはショーダウンの評価対象外', () => {
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

    // Player 0 はロイヤルフラッシュだが fold しているので評価外
    expect(result.winnerId).toBe('p1')
  })
})

describe('ゲームフロー統合: 一連のハンドフロー', () => {
  test('calculateBlinds → applyAction連続 → isRoundOver → determineWinner の完全フロー', () => {
    // 1. ブラインド計算
    const players = createActivePlayers(5)
    const blinds = calculateBlinds(players, -1)

    players[blinds.dealerIndex].role = 'dealer'
    players[blinds.smallBlindIndex].role = 'sb'
    players[blinds.bigBlindIndex].role = 'bb'

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    let currentBet = BIG_BLIND
    let currentPlayers = [...players]

    // 2. プリフロップ: UTG から順に全員がアクション
    //    UTG(3) → p4 → Dealer(0) → SB(1) → BB(2) の順
    let activeIndex = blinds.utgIndex

    // UTG calls
    let result = applyAction(currentPlayers, activeIndex, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet
    expect(isRoundOver(currentPlayers, currentBet)).toBe(false)

    // p4 calls
    activeIndex = getNextActivePlayer(activeIndex, currentPlayers)
    result = applyAction(currentPlayers, activeIndex, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet
    expect(isRoundOver(currentPlayers, currentBet)).toBe(false)

    // Dealer(0) calls
    activeIndex = getNextActivePlayer(activeIndex, currentPlayers)
    result = applyAction(currentPlayers, activeIndex, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet
    expect(isRoundOver(currentPlayers, currentBet)).toBe(false)

    // SB(1) calls（SMALL_BLIND との差額を追加）
    activeIndex = getNextActivePlayer(activeIndex, currentPlayers)
    result = applyAction(currentPlayers, activeIndex, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet
    expect(isRoundOver(currentPlayers, currentBet)).toBe(false)

    // BB(2) checks（既にcurrentBetと一致、action=nullなので call で check 相当）
    activeIndex = getNextActivePlayer(activeIndex, currentPlayers)
    result = applyAction(currentPlayers, activeIndex, 'call', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot
    currentBet = result.newCurrentBet
    expect(isRoundOver(currentPlayers, currentBet)).toBe(true)

    // 3. プリフロップ終了 — ポットの検証
    // UTG, p4, Dealer: 各 BIG_BLIND = 60
    // SB: SMALL_BLIND(投入済み) + SMALL_BLIND(追加) = BIG_BLIND
    // BB: BIG_BLIND(投入済み) + 0(追加) = BIG_BLIND
    expect(pot).toBe(BIG_BLIND * 5)

    // 4. カードを設定してショーダウン
    currentPlayers[0].cards = [card('hearts', 'A'), card('hearts', 'K')]
    currentPlayers[1].cards = [card('diamonds', '2'), card('clubs', '7')]
    currentPlayers[2].cards = [card('spades', '3'), card('clubs', '4')]
    currentPlayers[3].cards = [card('diamonds', '5'), card('clubs', '6')]
    currentPlayers[4].cards = [card('spades', '9'), card('clubs', '8')]

    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'),
      card('hearts', 'J'),
      card('hearts', '10'),
      card('clubs', '9'),
      card('spades', '2'),
    ]

    const winnerResult = determineWinner(currentPlayers, communityCards)
    expect(winnerResult.winnerId).toBe('p0')
    expect(winnerResult.handRankName).toBe('Royal Flush')

    // 5. 勝者にポットを付与
    const winnerIdx = currentPlayers.findIndex(p => p.id === winnerResult.winnerId)
    currentPlayers[winnerIdx] = {
      ...currentPlayers[winnerIdx],
      chips: currentPlayers[winnerIdx].chips + pot,
    }
    expect(currentPlayers[winnerIdx].chips).toBe(INITIAL_CHIPS - BIG_BLIND + pot)
  })

  test('途中で全員フォールドした場合のフロー', () => {
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)
    let currentBet = BIG_BLIND

    // UTG folds
    let result = applyAction(players, blinds.utgIndex, 'fold', 0, pot, currentBet)
    let currentPlayers = result.updatedPlayers
    pot = result.newPot

    // SB folds
    result = applyAction(currentPlayers, blinds.smallBlindIndex, 'fold', 0, pot, currentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot

    // 残り1人 → ラウンド終了
    expect(isRoundOver(currentPlayers, result.newCurrentBet)).toBe(true)

    const notFolded = currentPlayers.filter(p => p.isActive && p.action !== 'fold')
    expect(notFolded).toHaveLength(1)
    expect(notFolded[0].id).toBe(`p${blinds.bigBlindIndex}`)

    // 勝者にポット付与
    const winnerIdx = currentPlayers.findIndex(p => p.id === notFolded[0].id)
    currentPlayers[winnerIdx] = {
      ...currentPlayers[winnerIdx],
      chips: currentPlayers[winnerIdx].chips + pot,
    }
    expect(currentPlayers[winnerIdx].chips).toBe(INITIAL_CHIPS - BIG_BLIND + pot)
  })
})

describe('ゲームフロー統合: 連続ハンドのディーラー遷移', () => {
  test('calculateBlinds を連続呼び出しするとディーラーが順番に回る', () => {
    const players = createActivePlayers(5)

    const hand1 = calculateBlinds(players, -1)
    expect(hand1.dealerIndex).toBe(0)

    const hand2 = calculateBlinds(players, hand1.dealerIndex)
    expect(hand2.dealerIndex).toBe(1)

    const hand3 = calculateBlinds(players, hand2.dealerIndex)
    expect(hand3.dealerIndex).toBe(2)
  })

  test('プレイヤーが脱落してもディーラー遷移が正しく動作する', () => {
    const players = createActivePlayers(5)

    const hand1 = calculateBlinds(players, -1)
    expect(hand1.dealerIndex).toBe(0)

    // Player 1 が脱落
    players[1].isActive = false

    const hand2 = calculateBlinds(players, hand1.dealerIndex)
    expect(hand2.dealerIndex).toBe(2)

    // Player 3 も脱落
    players[3].isActive = false

    const hand3 = calculateBlinds(players, hand2.dealerIndex)
    expect(hand3.dealerIndex).toBe(4)
  })
})

describe('ゲームフロー統合: advancePhase での firstToAct 計算', () => {
  test('ディーラーの次のアクティブプレイヤーが firstToAct になる', () => {
    const players = createActivePlayers(5)
    const dealerIndex = 2

    // ラウンド完了状態をシミュレート
    players[0].action = 'call'
    players[1].action = 'call'
    players[2].action = 'call'
    players[3].action = 'call'
    players[4].action = 'call'

    const resetPlayers = players.map(p => ({
      ...p,
      currentBet: 0,
      action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null,
    }))

    const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)
    expect(firstToAct).toBe(3)
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
    // Player 1 は fold のまま → Player 2
    expect(firstToAct).toBe(2)
  })

  test('ディーラーの次がオールイン（chips=0）の場合スキップする', () => {
    const players = createActivePlayers(5)
    const dealerIndex = 0

    players[0].action = 'call'
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
    // Player 1 は all-in (chips=0) → Player 2
    expect(firstToAct).toBe(2)
  })
})
