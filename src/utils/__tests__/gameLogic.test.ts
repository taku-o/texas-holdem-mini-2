import type { Player, PlayingCard } from '../../types'
import {
  getNextActivePlayer,
  isRoundOver,
  calculateBlinds,
  applyAction,
  determineWinner,
  INITIAL_CHIPS,
  BIG_BLIND,
} from '../gameLogic'
import { card, createActivePlayers, createPlayer } from '../../__tests__/helpers'

describe('getNextActivePlayer', () => {
  test('次のアクティブプレイヤーのインデックスを返す', () => {
    const players = createActivePlayers(5)

    const result = getNextActivePlayer(0, players)

    expect(result).toBe(1)
  })

  test('非アクティブプレイヤーをスキップする', () => {
    const players = createActivePlayers(5)
    players[1].isActive = false

    const result = getNextActivePlayer(0, players)

    expect(result).toBe(2)
  })

  test('フォールド済みプレイヤーをスキップする', () => {
    const players = createActivePlayers(5)
    players[1].action = 'fold'

    const result = getNextActivePlayer(0, players)

    expect(result).toBe(2)
  })

  test('チップ0のプレイヤー（オールイン）をスキップする', () => {
    const players = createActivePlayers(5)
    players[1].chips = 0

    const result = getNextActivePlayer(0, players)

    expect(result).toBe(2)
  })

  test('末尾から先頭にラップアラウンドする', () => {
    const players = createActivePlayers(5)

    const result = getNextActivePlayer(4, players)

    expect(result).toBe(0)
  })

  test('連続する非アクティブプレイヤーをスキップしてラップアラウンドする', () => {
    const players = createActivePlayers(5)
    players[3].isActive = false
    players[4].isActive = false
    players[0].isActive = false

    const result = getNextActivePlayer(2, players)

    expect(result).toBe(1)
  })

  test('プレイヤー数が5以外（3人）でも正しく動作する', () => {
    const players = createActivePlayers(3)

    const result = getNextActivePlayer(2, players)

    expect(result).toBe(0)
  })

  test('自分以外全員が非アクティブの場合、自分のインデックスを返す', () => {
    const players = createActivePlayers(5)
    players[1].action = 'fold'
    players[2].action = 'fold'
    players[3].isActive = false
    players[4].chips = 0

    const result = getNextActivePlayer(0, players)

    expect(result).toBe(0)
  })
})

describe('isRoundOver', () => {
  test('アクティブプレイヤーが1人の場合trueを返す', () => {
    const players = createActivePlayers(5)
    players[1].action = 'fold'
    players[2].action = 'fold'
    players[3].action = 'fold'
    players[4].action = 'fold'

    const result = isRoundOver(players, 20)

    expect(result).toBe(true)
  })

  test('全員がアクション済みでベットが揃っている場合trueを返す', () => {
    const players = createActivePlayers(3)
    players[0].action = 'call'
    players[0].currentBet = 20
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'call'
    players[2].currentBet = 20

    const result = isRoundOver(players, 20)

    expect(result).toBe(true)
  })

  test('未アクションのプレイヤーがいる場合falseを返す', () => {
    const players = createActivePlayers(3)
    players[0].action = 'call'
    players[0].currentBet = 20
    players[1].action = null
    players[1].currentBet = 0

    const result = isRoundOver(players, 20)

    expect(result).toBe(false)
  })

  test('ベットが揃っていないプレイヤーがいる場合falseを返す', () => {
    const players = createActivePlayers(3)
    players[0].action = 'raise'
    players[0].currentBet = 40
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'call'
    players[2].currentBet = 20

    const result = isRoundOver(players, 40)

    expect(result).toBe(false)
  })

  test('オールインプレイヤー（chips=0）はアクション不要として扱う', () => {
    const players = createActivePlayers(3)
    players[0].action = 'all-in'
    players[0].currentBet = 10
    players[0].chips = 0
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'call'
    players[2].currentBet = 20

    const result = isRoundOver(players, 20)

    expect(result).toBe(true)
  })

  test('フォールド済みプレイヤーはアクティブ残りに含めない', () => {
    const players = createActivePlayers(3)
    players[0].action = 'fold'
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'call'
    players[2].currentBet = 20

    const result = isRoundOver(players, 20)

    expect(result).toBe(true)
  })

  test('非アクティブプレイヤー（isActive=false）は残りに含めない', () => {
    const players = createActivePlayers(3)
    players[0].isActive = false
    players[1].action = 'call'
    players[1].currentBet = 20
    players[2].action = 'call'
    players[2].currentBet = 20

    const result = isRoundOver(players, 20)

    expect(result).toBe(true)
  })
})

describe('calculateBlinds', () => {
  test('dealerIndex=-1の場合、インデックス0からディーラーを決定する', () => {
    const players = createActivePlayers(5)

    const result = calculateBlinds(players, -1)

    expect(result.dealerIndex).toBe(0)
  })

  test('ディーラーの次にSB、SBの次にBBを配置する', () => {
    const players = createActivePlayers(5)

    const result = calculateBlinds(players, -1)

    expect(result.dealerIndex).toBe(0)
    expect(result.smallBlindIndex).toBe(1)
    expect(result.bigBlindIndex).toBe(2)
    expect(result.utgIndex).toBe(3)
  })

  test('前回ディーラーの次のアクティブプレイヤーがディーラーになる', () => {
    const players = createActivePlayers(5)

    const result = calculateBlinds(players, 2)

    expect(result.dealerIndex).toBe(3)
    expect(result.smallBlindIndex).toBe(4)
    expect(result.bigBlindIndex).toBe(0)
    expect(result.utgIndex).toBe(1)
  })

  test('非アクティブプレイヤーをスキップしてポジションを割り当てる', () => {
    const players = createActivePlayers(5)
    players[1].isActive = false
    players[3].isActive = false

    const result = calculateBlinds(players, 0)

    expect(result.dealerIndex).toBe(2)
    expect(result.smallBlindIndex).toBe(4)
    expect(result.bigBlindIndex).toBe(0)
  })

  test('末尾から先頭へのラップアラウンドが正しく動作する', () => {
    const players = createActivePlayers(5)

    const result = calculateBlinds(players, 3)

    expect(result.dealerIndex).toBe(4)
    expect(result.smallBlindIndex).toBe(0)
    expect(result.bigBlindIndex).toBe(1)
    expect(result.utgIndex).toBe(2)
  })

  test('3人プレイヤーで正しく動作する', () => {
    const players = createActivePlayers(3)

    const result = calculateBlinds(players, -1)

    expect(result.dealerIndex).toBe(0)
    expect(result.smallBlindIndex).toBe(1)
    expect(result.bigBlindIndex).toBe(2)
    expect(result.utgIndex).toBe(0)
  })

  test('dealerIndex=-1で最初のプレイヤーが非アクティブの場合、次のアクティブプレイヤーがディーラーになる', () => {
    const players = createActivePlayers(5)
    players[0].isActive = false

    const result = calculateBlinds(players, -1)

    expect(result.dealerIndex).toBe(1)
  })
})

describe('applyAction', () => {
  describe('fold', () => {
    test('プレイヤーのアクションがfoldになる', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'fold', 0, 100, 20)

      expect(result.updatedPlayers[0].action).toBe('fold')
    })

    test('チップとポットが変化しない', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'fold', 0, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS)
      expect(result.newPot).toBe(100)
    })

    test('ログメッセージにフォールドが記録される', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'fold', 0, 100, 20)

      expect(result.logMessage).toContain('fold')
    })

    test('元のplayers配列を変更しない', () => {
      const players = createActivePlayers(3)
      const originalChips = players[0].chips

      applyAction(players, 0, 'fold', 0, 100, 20)

      expect(players[0].chips).toBe(originalChips)
      expect(players[0].action).toBeNull()
    })
  })

  describe('call', () => {
    test('コールに必要な差額をチップから引きポットに加算する', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'call', 0, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS - 20)
      expect(result.updatedPlayers[0].currentBet).toBe(20)
      expect(result.newPot).toBe(120)
    })

    test('既にベットしている分を差し引いてコールする', () => {
      const players = createActivePlayers(3)
      players[0].currentBet = 10
      players[0].chips = INITIAL_CHIPS - 10

      const result = applyAction(players, 0, 'call', 0, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS - 20)
      expect(result.updatedPlayers[0].currentBet).toBe(20)
      expect(result.newPot).toBe(110)
    })

    test('チップが足りない場合オールインになる', () => {
      const players = createActivePlayers(3)
      players[0].chips = 10

      const result = applyAction(players, 0, 'call', 0, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(0)
      expect(result.updatedPlayers[0].action).toBe('all-in')
      expect(result.newPot).toBe(110)
    })

    test('チップが十分な場合アクションがcallになる', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'call', 0, 100, 20)

      expect(result.updatedPlayers[0].action).toBe('call')
    })
  })

  describe('raise', () => {
    test('レイズ額が適用されチップから引かれる', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'raise', 40, 100, 20)

      expect(result.updatedPlayers[0].currentBet).toBe(40)
      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS - 40)
      expect(result.newPot).toBe(140)
    })

    test('currentBetが更新される', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'raise', 40, 100, 20)

      expect(result.newCurrentBet).toBe(40)
    })

    test('最低レイズ額（currentBet*2）が適用される', () => {
      const players = createActivePlayers(3)

      // amount=25 < currentBet*2=40 なので40が適用される
      const result = applyAction(players, 0, 'raise', 25, 100, 20)

      expect(result.updatedPlayers[0].currentBet).toBe(40)
    })

    test('currentBetが0の場合BIG_BLINDが最低レイズ額になる', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'raise', 10, 0, 0)

      expect(result.updatedPlayers[0].currentBet).toBe(BIG_BLIND)
    })

    test('チップが足りない場合オールインになる', () => {
      const players = createActivePlayers(3)
      players[0].chips = 30

      const result = applyAction(players, 0, 'raise', 100, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(0)
      expect(result.updatedPlayers[0].action).toBe('all-in')
    })

    test('チップが十分な場合アクションがraiseになる', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'raise', 40, 100, 20)

      expect(result.updatedPlayers[0].action).toBe('raise')
    })

    test('ログメッセージにレイズ後のベット額が記録される', () => {
      const players = createActivePlayers(3)

      const result = applyAction(players, 0, 'raise', 40, 100, 20)

      expect(result.logMessage).toContain('raises')
    })

    test('既にベットしている分を差し引いてレイズする', () => {
      const players = createActivePlayers(3)
      players[0].currentBet = 20
      players[0].chips = INITIAL_CHIPS - 20

      const result = applyAction(players, 0, 'raise', 60, 100, 20)

      expect(result.updatedPlayers[0].currentBet).toBe(60)
      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS - 60)
      expect(result.newPot).toBe(140)
    })

    test('amountが最低レイズ額と同じ場合、既存ベットとの差分だけ追加される', () => {
      const players = createActivePlayers(3)
      players[0].currentBet = 20
      players[0].chips = INITIAL_CHIPS - 20

      const result = applyAction(players, 0, 'raise', 40, 100, 20)

      expect(result.updatedPlayers[0].chips).toBe(INITIAL_CHIPS - 40)
      expect(result.updatedPlayers[0].currentBet).toBe(40)
      expect(result.newPot).toBe(120)
    })
  })

  describe('不変性', () => {
    test('他のプレイヤーの状態を変更しない', () => {
      const players = createActivePlayers(3)
      players[1].chips = 500
      players[2].chips = 700

      const result = applyAction(players, 0, 'call', 0, 100, 20)

      expect(result.updatedPlayers[1].chips).toBe(500)
      expect(result.updatedPlayers[2].chips).toBe(700)
    })
  })
})

describe('determineWinner', () => {
  test('最も高いハンドランクのプレイヤーが勝者になる', () => {
    const players: Player[] = [
      createPlayer({
        id: 'p0',
        name: 'Player 0',
        cards: [card('hearts', 'A'), card('hearts', 'K')],
      }),
      createPlayer({
        id: 'p1',
        name: 'Player 1',
        cards: [card('diamonds', '2'), card('clubs', '7')],
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'),
      card('hearts', 'J'),
      card('hearts', '10'),
    ]

    const result = determineWinner(players, communityCards)

    expect(result.winnerId).toBe('p0')
    expect(result.winnerName).toBe('Player 0')
    expect(result.handRankName).toBe('Royal Flush')
  })

  test('同じランクの場合スコアが高い方が勝者になる', () => {
    const players: Player[] = [
      createPlayer({
        id: 'p0',
        name: 'Player 0',
        cards: [card('hearts', 'A'), card('diamonds', 'K')],
      }),
      createPlayer({
        id: 'p1',
        name: 'Player 1',
        cards: [card('spades', 'A'), card('clubs', 'Q')],
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('clubs', 'A'),
      card('spades', '7'),
      card('hearts', '3'),
    ]

    const result = determineWinner(players, communityCards)

    expect(result.winnerId).toBe('p0')
  })

  test('フォールドしていないアクティブプレイヤーのみを評価対象とする', () => {
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
      }),
    ]
    const communityCards: PlayingCard[] = [
      card('hearts', 'Q'),
      card('hearts', 'J'),
      card('hearts', '10'),
    ]

    const result = determineWinner(players, communityCards)

    expect(result.winnerId).toBe('p1')
  })

  test('handRankNameが勝者のハンドランク名を返す', () => {
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

    expect(result.winnerId).toBe('p0')
    expect(result.handRankName).toBe('One Pair')
  })
})
