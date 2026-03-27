import type { Player, PlayingCard } from '../types';
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

export interface WinnerResult {
  winnerId: string;
  winnerName: string;
  handRankName: string;
}

export const getNextActivePlayer = (currentIndex: number, players: Player[]): number => {
  let next = (currentIndex + 1) % players.length;
  while (
    next !== currentIndex &&
    (!players[next].isActive || players[next].action === 'fold' || players[next].chips === 0)
  ) {
    next = (next + 1) % players.length;
  }
  return next;
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
    newPot += actualCall;
    p.action = p.chips === 0 ? 'all-in' : 'call';
    logMessage = actualCall > 0 ? `${p.name} calls $${actualCall}.` : `${p.name} calls.`;
  } else if (action === 'raise') {
    const minRaise = newCurrentBet === 0 ? BIG_BLIND : newCurrentBet * 2;
    const raiseAmount = Math.min(
      p.chips,
      Math.max(minRaise, amount) - p.currentBet,
    );
    p.chips -= raiseAmount;
    p.currentBet += raiseAmount;
    newPot += raiseAmount;
    newCurrentBet = Math.max(newCurrentBet, p.currentBet);
    p.action = p.chips === 0 ? 'all-in' : 'raise';
    logMessage = `${p.name} raises to $${p.currentBet}.`;
  }

  const updatedPlayers = [...players];
  updatedPlayers[playerIndex] = p;

  return { updatedPlayers, newPot, newCurrentBet, logMessage };
};

export const determineWinner = (players: Player[], communityCards: PlayingCard[]): WinnerResult => {
  const activePlayers = players.filter(p => p.isActive && p.action !== 'fold');

  if (activePlayers.length === 0) {
    return { winnerId: '', winnerName: '', handRankName: '' };
  }

  const results = activePlayers.map(p => ({
    player: p,
    eval: evaluateHand(p.cards, communityCards),
  }));

  results.sort((a, b) => b.eval.score - a.eval.score);

  const winner = results[0];
  return {
    winnerId: winner.player.id,
    winnerName: winner.player.name,
    handRankName: winner.eval.rankName,
  };
};
