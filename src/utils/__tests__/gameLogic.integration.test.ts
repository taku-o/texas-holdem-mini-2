import type { Player, PlayingCard } from '../../types'
import {
  getNextActivePlayer,
  isRoundOver,
  calculateBlinds,
  applyAction,
  determineWinner,
  calculateSidePots,
  distributePots,
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
} from '../gameLogic'
import { card, createActivePlayers, createPlayer, resetPlayersForNewRound } from '../../__tests__/helpers'

const postBlind = (players: Player[], index: number, amount: number): number => {
  const actual = Math.min(players[index].chips, amount)
  players[index].chips -= actual
  players[index].currentBet += actual
  players[index].totalContribution += actual
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

  test('postBlind が totalContribution を加算する', () => {
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    expect(players[blinds.smallBlindIndex].totalContribution).toBe(0)
    expect(players[blinds.bigBlindIndex].totalContribution).toBe(0)

    postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    expect(players[blinds.smallBlindIndex].totalContribution).toBe(SMALL_BLIND)
    expect(players[blinds.bigBlindIndex].totalContribution).toBe(BIG_BLIND)
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
    const pot = BIG_BLIND

    const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
    expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)

    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(false)

    const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)
    expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
  })

  test('レイズ後は他プレイヤーが再度アクションするまでラウンド続行', () => {
    const players = createActivePlayers(3)
    const currentBet = BIG_BLIND
    const pot = BIG_BLIND

    const r0 = applyAction(players, 0, 'raise', 40, pot, currentBet)
    expect(isRoundOver(r0.updatedPlayers, r0.newCurrentBet)).toBe(false)

    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)
    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(false)

    const r2 = applyAction(r1.updatedPlayers, 2, 'call', 0, r1.newPot, r1.newCurrentBet)
    expect(isRoundOver(r2.updatedPlayers, r2.newCurrentBet)).toBe(true)
  })

  test('getNextActivePlayer でフォールド済みプレイヤーをスキップしてアクション順が進む', () => {
    const players = createActivePlayers(5)
    const currentBet = BIG_BLIND
    const pot = BIG_BLIND

    const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)

    // 次のアクティブプレイヤーはフォールド済みの0をスキップ
    const next = getNextActivePlayer(0, r0.updatedPlayers)
    expect(next).toBe(1)
    expect(r0.updatedPlayers[next].action).toBeNull()
  })

  test('全員フォールドで残り1人になるとラウンド終了', () => {
    const players = createActivePlayers(3)
    const currentBet = BIG_BLIND
    const pot = BIG_BLIND

    const r0 = applyAction(players, 0, 'fold', 0, pot, currentBet)
    const r1 = applyAction(r0.updatedPlayers, 1, 'fold', 0, r0.newPot, r0.newCurrentBet)

    expect(isRoundOver(r1.updatedPlayers, r1.newCurrentBet)).toBe(true)
  })

  test('オールインプレイヤーを含むラウンド終了判定が正しい', () => {
    const players = createActivePlayers(3)
    players[0].chips = 10
    const currentBet = BIG_BLIND
    const pot = BIG_BLIND

    const r0 = applyAction(players, 0, 'call', 0, pot, currentBet)
    expect(r0.updatedPlayers[0].action).toBe('all-in')
    expect(r0.updatedPlayers[0].chips).toBe(0)

    const r1 = applyAction(r0.updatedPlayers, 1, 'call', 0, r0.newPot, r0.newCurrentBet)

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

    const resetPlayers = resetPlayersForNewRound(players)

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

    const resetPlayers = resetPlayersForNewRound(players)

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

    const resetPlayers = resetPlayersForNewRound(players)

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

    const resetPlayers = resetPlayersForNewRound(players)

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

    const resetPlayers = resetPlayersForNewRound(players)

    const firstToAct = getNextActivePlayer(dealerIndex, resetPlayers)
    // Player 1 は all-in (chips=0) → Player 2
    expect(firstToAct).toBe(2)
  })
})

describe('ゲームフロー統合: postBlind + applyAction + calculateSidePots 累積計算フロー', () => {
  test('ブラインド投入 → applyAction の totalContribution 累積 → calculateSidePots の一貫性', () => {
    // Given: ブラインド投入（totalContribution 付き）
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    const currentBet = BIG_BLIND

    // When: UTG がコール → SB がコール → BB がチェック
    let result = applyAction(players, blinds.utgIndex, 'call', 0, pot, currentBet)
    let currentPlayers = result.updatedPlayers
    pot = result.newPot

    result = applyAction(currentPlayers, blinds.smallBlindIndex, 'call', 0, pot, result.newCurrentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot

    result = applyAction(currentPlayers, blinds.bigBlindIndex, 'call', 0, pot, result.newCurrentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot

    // Then: 全員 BIG_BLIND ずつの totalContribution
    for (const p of currentPlayers) {
      expect(p.totalContribution).toBe(BIG_BLIND)
    }

    // calculateSidePots が正しくポットを計算する
    const pots = calculateSidePots(currentPlayers)
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(BIG_BLIND * 3)
    expect(pots[0].eligiblePlayerIds).toHaveLength(3)

    // チップ保存則: pot === sum(totalContribution)
    const totalContribution = currentPlayers.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(pot).toBe(totalContribution)
  })

  test('オールインを含むブラインド投入 → applyAction → calculateSidePots', () => {
    // Given: SB が少額チップでオールインブラインド
    const players = createActivePlayers(3)
    const blinds = calculateBlinds(players, -1)
    players[blinds.smallBlindIndex].chips = 5

    let pot = 0
    pot += postBlind(players, blinds.smallBlindIndex, SMALL_BLIND)
    pot += postBlind(players, blinds.bigBlindIndex, BIG_BLIND)

    const currentBet = BIG_BLIND

    // When: UTG コール → BB チェック（SB はオールイン済み）
    let result = applyAction(players, blinds.utgIndex, 'call', 0, pot, currentBet)
    let currentPlayers = result.updatedPlayers
    pot = result.newPot

    result = applyAction(currentPlayers, blinds.bigBlindIndex, 'call', 0, pot, result.newCurrentBet)
    currentPlayers = result.updatedPlayers
    pot = result.newPot

    // Then: SB の totalContribution は 5、他は BIG_BLIND
    expect(currentPlayers[blinds.smallBlindIndex].totalContribution).toBe(5)
    expect(currentPlayers[blinds.utgIndex].totalContribution).toBe(BIG_BLIND)
    expect(currentPlayers[blinds.bigBlindIndex].totalContribution).toBe(BIG_BLIND)

    // calculateSidePots でサイドポットが生成される
    const pots = calculateSidePots(currentPlayers)
    expect(pots.length).toBeGreaterThanOrEqual(2)

    // チップ保存則
    const totalPotAmount = pots.reduce((sum, p) => sum + p.amount, 0)
    const totalContribution = currentPlayers.reduce((sum, p) => sum + p.totalContribution, 0)
    expect(totalPotAmount).toBe(totalContribution)
  })
})

describe('ゲームフロー統合: calculateSidePots → distributePots → チップ保存則', () => {
  const communityCards: PlayingCard[] = [
    card('clubs', '2'), card('diamonds', '3'), card('spades', '8'),
    card('clubs', 'J'), card('diamonds', '9'),
  ]

  test('オールインプレイヤーの showdown 分配でチップ総額が保存される', () => {
    // Given: 3人で p0 が少額オールイン
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 0, totalContribution: 50, action: 'all-in',
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: INITIAL_CHIPS - 100, totalContribution: 100,
        cards: [card('spades', 'K'), card('hearts', 'K')],
      }),
      createPlayer({
        id: 'p2', name: 'Player 2', chips: INITIAL_CHIPS - 100, totalContribution: 100,
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
    ]

    const totalChipsBefore = players.reduce((s, p) => s + p.chips + p.totalContribution, 0)

    // When
    const pots = calculateSidePots(players)
    const { updatedPlayers } = distributePots(pots, players, communityCards)

    // Then: チップ保存則
    const totalChipsAfter = updatedPlayers.reduce((s, p) => s + p.chips, 0)
    // 分配後の chips 合計 = 分配前の (chips + totalContribution) 合計
    expect(totalChipsAfter).toBe(totalChipsBefore)
  })

  test('フォールドプレイヤーを含むサイドポット分配でチップ総額が保存される', () => {
    // Given
    const players: Player[] = [
      createPlayer({
        id: 'p0', name: 'Player 0', chips: 0, totalContribution: 30, action: 'all-in',
        cards: [card('spades', 'A'), card('hearts', 'A')],
      }),
      createPlayer({
        id: 'p1', name: 'Player 1', chips: INITIAL_CHIPS - 70, totalContribution: 70, action: 'fold',
        cards: [card('spades', '4'), card('hearts', '6')],
      }),
      createPlayer({
        id: 'p2', name: 'Player 2', chips: INITIAL_CHIPS - 100, totalContribution: 100,
        cards: [card('spades', 'K'), card('hearts', 'K')],
      }),
      createPlayer({
        id: 'p3', name: 'Player 3', chips: INITIAL_CHIPS - 100, totalContribution: 100,
        cards: [card('hearts', '4'), card('hearts', '6')],
      }),
    ]

    const totalChipsBefore = players.reduce((s, p) => s + p.chips + p.totalContribution, 0)

    // When
    const pots = calculateSidePots(players)
    const { updatedPlayers } = distributePots(pots, players, communityCards)

    // Then
    const totalChipsAfter = updatedPlayers.reduce((s, p) => s + p.chips, 0)
    expect(totalChipsAfter).toBe(totalChipsBefore)
  })
})
