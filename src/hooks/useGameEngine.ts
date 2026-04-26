import { useState, useEffect, useCallback } from 'react';
import type { Player } from '../types';
import { createAndShuffleDeck } from '../utils/deck';
import {
  INITIAL_CHIPS,
  SMALL_BLIND,
  BIG_BLIND,
  getNextActivePlayer,
  isRoundOver,
  calculateBlinds,
  applyAction,
  calculateSidePots,
  distributePots,
  dealCommunityCards,
} from '../utils/gameLogic';
import type { GamePhase, GameState } from '../utils/gameLogic';

export type { GamePhase, GameState };

const BETTING_PHASES: ReadonlySet<GamePhase> = new Set(['pre-flop', 'flop', 'turn', 'river']);

const SHOWDOWN_DISPLAY_DELAY = 5000;
const PHASE_ADVANCE_DELAY = 500;

export const useGameEngine = () => {
  const [state, setState] = useState<GameState>({
    players: [],
    communityCards: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    phase: 'idle',
    activePlayerIndex: -1,
    dealerIndex: -1,
    logs: []
  });

  const startNextHand = useCallback(() => {
    setState(prevState => {
      const players: Player[] = prevState.players.map(p => ({
        ...p,
        cards: [],
        currentBet: 0,
        totalContribution: 0,
        action: null,
        role: null,
        isActive: p.chips > 0
      }));

      const activeCount = players.filter(p => p.isActive).length;
      if (activeCount <= 1) {
        return { ...prevState, phase: 'game-over', logs: ['Game Over!'] };
      }

      const deck = createAndShuffleDeck();
      const blinds = calculateBlinds(players, prevState.dealerIndex);

      players[blinds.dealerIndex].role = 'dealer';
      players[blinds.smallBlindIndex].role = 'sb';
      players[blinds.bigBlindIndex].role = 'bb';

      let pot = 0;
      const postBlind = (idx: number, amount: number) => {
        const actual = Math.min(players[idx].chips, amount);
        players[idx].chips -= actual;
        players[idx].currentBet += actual;
        players[idx].totalContribution += actual;
        pot += actual;
      };
      postBlind(blinds.smallBlindIndex, SMALL_BLIND);
      postBlind(blinds.bigBlindIndex, BIG_BLIND);

      for (let i = 0; i < 2; i++) {
        players.forEach(p => {
          if (p.isActive) p.cards.push(deck.pop()!);
        });
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
        logs: ['New hand started.', `Dealer is ${players[blinds.dealerIndex].name}`]
      };
    });
  }, []);

  const advancePhase = useCallback(() => {
    setState(prev => {
      let newPhase: GamePhase = prev.phase;

      if (prev.phase === 'pre-flop') {
        newPhase = 'flop';
      } else if (prev.phase === 'flop') {
        newPhase = 'turn';
      } else if (prev.phase === 'turn') {
        newPhase = 'river';
      } else if (prev.phase === 'river') {
        newPhase = 'showdown';
      }

      const { newCommunityCards, newDeck } = dealCommunityCards(prev.phase, prev.communityCards, prev.deck);

      const resetPlayers = prev.players.map(p => ({
        ...p,
        currentBet: 0,
        action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null
      }));

      if (newPhase === 'showdown') {
        const activePlayers = resetPlayers.filter(p => p.isActive && p.action !== 'fold');
        if (activePlayers.length > 1) {
          const pots = calculateSidePots(resetPlayers);
          const { updatedPlayers, awards } = distributePots(pots, resetPlayers, newCommunityCards);
          const finalPlayers = updatedPlayers.map(p => ({ ...p, totalContribution: 0 }));
          const awardLogs = awards.map(a => `${a.playerName} wins $${a.amount} with ${a.handRankName}`);

          return {
            ...prev,
            players: finalPlayers,
            communityCards: newCommunityCards,
            deck: newDeck,
            phase: 'showdown',
            pot: 0,
            currentBet: 0,
            activePlayerIndex: -1,
            logs: [...awardLogs, ...prev.logs].slice(0, 10)
          };
        }
      }

      return {
        ...prev,
        players: resetPlayers,
        communityCards: newCommunityCards,
        deck: newDeck,
        phase: newPhase,
        currentBet: 0,
        activePlayerIndex: newPhase === 'showdown' ? -1 : getNextActivePlayer(prev.dealerIndex, resetPlayers)
      };
    });
  }, []);

  const startGame = useCallback(() => {
    const humanIndex = Math.floor(Math.random() * 5);
    const initialPlayers: Player[] = Array.from({ length: 5 }).map((_, i) => ({
      id: i === humanIndex ? 'p1' : `cpu${i}`,
      name: i === humanIndex ? 'You (Player)' : `CPU ${i}`,
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalContribution: 0,
      isActive: true,
      isHuman: i === humanIndex,
      cards: [],
      action: null,
      role: null
    }));

    setState({
      players: initialPlayers,
      communityCards: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      phase: 'idle',
      activePlayerIndex: -1,
      dealerIndex: -1,
      logs: ['Game started!']
    });

    setTimeout(() => startNextHand(), 500);
  }, [startNextHand]);

  const handleAction = useCallback((action: 'fold'|'call'|'raise', amount: number = 0) => {
    setState(prev => {
      if (prev.phase === 'showdown' || prev.phase === 'game-over') return prev;

      const pIndex = prev.activePlayerIndex;
      const result = applyAction(prev.players, pIndex, action, amount, prev.pot, prev.currentBet);
      const { updatedPlayers: newPlayers, newPot, newCurrentBet, logMessage } = result;

      const notFolded = newPlayers.filter(p => p.isActive && p.action !== 'fold');
      if (notFolded.length === 1) {
        const winner = notFolded[0];
        const updatedWinner = { ...winner, chips: winner.chips + newPot };
        newPlayers[newPlayers.findIndex(p => p.id === winner.id)] = updatedWinner;
        const finalPlayers = newPlayers.map(p => ({ ...p, totalContribution: 0 }));

        return {
          ...prev,
          players: finalPlayers,
          pot: 0,
          phase: 'showdown',
          activePlayerIndex: -1,
          logs: [logMessage, `${updatedWinner.name} wins $${newPot} (others folded)!`, ...prev.logs].slice(0, 10)
        };
      }

      const updatedState = {
        ...prev,
        players: newPlayers,
        pot: newPot,
        currentBet: newCurrentBet,
        logs: [logMessage, ...prev.logs].slice(0, 10)
      };

      if (isRoundOver(newPlayers, newCurrentBet)) {
        return { ...updatedState, activePlayerIndex: -1 };
      } else {
        const nextActive = getNextActivePlayer(pIndex, newPlayers);
        return { ...updatedState, activePlayerIndex: nextActive };
      }
    });
  }, []);

  useEffect(() => {
    if (state.activePlayerIndex === -1 && BETTING_PHASES.has(state.phase)) {
      const timer = setTimeout(() => advancePhase(), PHASE_ADVANCE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state.activePlayerIndex, state.phase, advancePhase]);

  useEffect(() => {
    if (state.phase === 'showdown') {
      const timer = setTimeout(() => startNextHand(), SHOWDOWN_DISPLAY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state.phase, startNextHand]);

  useEffect(() => {
    if (state.activePlayerIndex !== -1) {
      const active = state.players[state.activePlayerIndex];
      if (!active.isHuman && state.phase !== 'showdown' && state.phase !== 'idle' && state.phase !== 'game-over') {
        const timer = setTimeout(() => {
          const toCall = state.currentBet - active.currentBet;
          const random = Math.random();

          if (toCall === 0) {
            if (random < 0.2 && active.chips > BIG_BLIND) handleAction('raise', state.currentBet + BIG_BLIND);
            else handleAction('call');
          } else {
            if (random < 0.15) handleAction('fold');
            else if (random < 0.3 && active.chips > state.currentBet * 2) handleAction('raise', state.currentBet * 2);
            else handleAction('call');
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.activePlayerIndex, state.phase, state.currentBet, state.players, handleAction]);

  return { state, startGame, handleAction };
};
