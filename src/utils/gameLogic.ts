import type { Player, PlayingCard, Pot } from '../types';
import { evaluateHand } from './evaluator';

export type GamePhase = 'idle' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game-over';

export interface GameState {
  players: Player[];
  communityCards: PlayingCard[];
  deck: PlayingCard[];
  pot: number;
  currentBet: number;
  phase: GamePhase;
  activePlayerIndex: number;
  dealerIndex: number;
  logs: string[];
}

export const INITIAL_CHIPS = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export interface BlindPositions {
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  utgIndex: number;
}

export interface ApplyActionResult {
  updatedPlayers: Player[];
  newPot: number;
  newCurrentBet: number;
  logMessage: string;
}

export const getNextActivePlayer = (currentIndex: number, players: Player[]): number => {
  let next = (currentIndex + 1) % players.length;
  let count = 0;
  while (count < players.length) {
    if (players[next].isActive && players[next].action !== 'fold' && players[next].chips > 0) {
      return next;
    }
    next = (next + 1) % players.length;
    count++;
  }
  return -1;
};

export const isRoundOver = (players: Player[], currentBet: number): boolean => {
  const activeRemaining = players.filter(p => p.isActive && p.action !== 'fold');
  if (activeRemaining.length === 1) return true;

  const needToAct = activeRemaining.some(p => {
    if (p.chips === 0) return false;
    if (p.action === null) return true;
    if (p.currentBet < currentBet) return true;
    return false;
  });
  return !needToAct;
};

export const calculateBlinds = (players: Player[], dealerIndex: number): BlindPositions => {
  const findNextActive = (start: number): number => {
    const startIdx = start % players.length;
    let idx = startIdx;
    do {
      if (players[idx].isActive) return idx;
      idx = (idx + 1) % players.length;
    } while (idx !== startIdx);
    return startIdx;
  };

  const dealer = findNextActive(dealerIndex === -1 ? 0 : dealerIndex + 1);
  const sb = findNextActive(dealer + 1);
  const bb = findNextActive(sb + 1);
  const utg = findNextActive(bb + 1);

  return { dealerIndex: dealer, smallBlindIndex: sb, bigBlindIndex: bb, utgIndex: utg };
};

export const applyAction = (
  players: Player[],
  playerIndex: number,
  action: 'fold' | 'call' | 'raise',
  amount: number,
  pot: number,
  currentBet: number,
): ApplyActionResult => {
  const p = { ...players[playerIndex] };
  let newPot = pot;
  let newCurrentBet = currentBet;
  let logMessage = '';

  if (action === 'fold') {
    p.action = 'fold';
    logMessage = `${p.name} folds.`;
  } else if (action === 'call') {
    const toCall = newCurrentBet - p.currentBet;
    const actualCall = Math.min(p.chips, toCall);
    p.chips -= actualCall;
    p.currentBet += actualCall;
    p.totalContribution += actualCall;
    newPot += actualCall;
    p.action = p.chips === 0 ? 'all-in' : 'call';
    logMessage = actualCall > 0 ? `${p.name} calls $${actualCall}.` : `${p.name} calls.`;
  } else if (action === 'raise') {
    const minRaise = newCurrentBet === 0 ? BIG_BLIND : newCurrentBet * 2;
    const raiseAmount = Math.min(
      p.chips,
      Math.max(0, minRaise - p.currentBet, amount - p.currentBet),
    );
    p.chips -= raiseAmount;
    p.currentBet += raiseAmount;
    p.totalContribution += raiseAmount;
    newPot += raiseAmount;
    newCurrentBet = Math.max(newCurrentBet, p.currentBet);
    p.action = p.chips === 0 ? 'all-in' : 'raise';
    logMessage = `${p.name} raises to $${p.currentBet}.`;
  }

  const updatedPlayers = [...players];
  updatedPlayers[playerIndex] = p;

  return { updatedPlayers, newPot, newCurrentBet, logMessage };
};

export interface DealCommunityCardsResult {
  newCommunityCards: PlayingCard[];
  newDeck: PlayingCard[];
}

export const dealCommunityCards = (
  phase: GamePhase,
  communityCards: PlayingCard[],
  deck: PlayingCard[],
): DealCommunityCardsResult => {
  const newDeck = [...deck];
  const newCommunityCards = [...communityCards];

  const burnAndDeal = (count: number) => {
    newDeck.pop(); // burn
    for (let i = 0; i < count; i++) {
      newCommunityCards.push(newDeck.pop()!);
    }
  };

  if (phase === 'pre-flop') {
    burnAndDeal(3);
  } else if (phase === 'flop' || phase === 'turn') {
    burnAndDeal(1);
  }

  return { newCommunityCards, newDeck };
};


export interface PotAward {
  playerId: string;
  playerName: string;
  amount: number;
  handRankName: string;
}

export interface DistributePotsResult {
  updatedPlayers: Player[];
  awards: PotAward[];
}

export const distributePots = (
  pots: Pot[],
  players: Player[],
  communityCards: PlayingCard[],
): DistributePotsResult => {
  const currentPlayers = players.map(p => ({ ...p, cards: [...p.cards] }));
  const awards: PotAward[] = [];

  for (const pot of pots) {
    const evaluated = players
      .map((player, originalIndex) => ({ player, originalIndex }))
      .filter(({ player }) => pot.eligiblePlayerIds.includes(player.id))
      .map(({ player, originalIndex }) => ({
        player,
        originalIndex,
        eval: evaluateHand(player.cards, communityCards),
      }));

    if (evaluated.length === 0) continue;

    const maxScore = Math.max(...evaluated.map(e => e.eval.score));
    const tiedWinners = evaluated
      .filter(e => e.eval.score === maxScore)
      .sort((a, b) => a.originalIndex - b.originalIndex);

    const baseAmount = Math.floor(pot.amount / tiedWinners.length);
    const remainder = pot.amount % tiedWinners.length;

    for (let i = 0; i < tiedWinners.length; i++) {
      const winner = tiedWinners[i];
      const awardAmount = baseAmount + (i === 0 ? remainder : 0);

      awards.push({
        playerId: winner.player.id,
        playerName: winner.player.name,
        amount: awardAmount,
        handRankName: winner.eval.rankName,
      });

      const playerIdx = currentPlayers.findIndex(p => p.id === winner.player.id);
      currentPlayers[playerIdx] = {
        ...currentPlayers[playerIdx],
        chips: currentPlayers[playerIdx].chips + awardAmount,
      };
    }
  }

  return { updatedPlayers: currentPlayers, awards };
};

export const calculateSidePots = (players: Player[]): Pot[] => {
  const contributors = players.filter(p => p.totalContribution > 0);

  if (contributors.length === 0) return [];

  const uniqueLevels = [...new Set(contributors.map(p => p.totalContribution))].sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prevLevel = 0;
  let remaining = contributors;

  for (const level of uniqueLevels) {
    const diff = level - prevLevel;
    const amount = diff * remaining.length;
    const eligiblePlayerIds = remaining
      .filter(p => p.action !== 'fold')
      .map(p => p.id);

    if (amount > 0) {
      pots.push({ amount, eligiblePlayerIds });
    }

    remaining = remaining.filter(p => p.totalContribution > level);
    prevLevel = level;
  }

  return pots;
};
