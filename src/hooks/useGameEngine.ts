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
  determineWinner,
} from '../utils/gameLogic';
import type { GamePhase, GameState } from '../utils/gameLogic';

export type { GamePhase, GameState };

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

  const appendLog = (msg: string) => {
    setState(s => ({ ...s, logs: [msg, ...s.logs].slice(0, 10) }));
  };

  const startGame = useCallback(() => {
    const humanIndex = Math.floor(Math.random() * 5);
    const initialPlayers: Player[] = Array.from({ length: 5 }).map((_, i) => ({
      id: i === humanIndex ? 'p1' : `cpu${i}`,
      name: i === humanIndex ? 'You (Player)' : `CPU ${i}`,
      chips: INITIAL_CHIPS,
      currentBet: 0,
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

    setTimeout(() => startNextHand(initialPlayers, -1), 500);
  }, []);

  const startNextHand = (currentPlayers: Player[], currentDealer: number) => {
    let players: Player[] = currentPlayers.map(p => ({
      ...p,
      cards: [],
      currentBet: 0,
      action: null,
      role: null,
      isActive: p.chips > 0
    }));

    const activeCount = players.filter(p => p.isActive).length;
    if (activeCount <= 1) {
      setState(s => ({ ...s, phase: 'game-over', logs: ['Game Over!'] }));
      return;
    }

    const deck = createAndShuffleDeck();
    const blinds = calculateBlinds(players, currentDealer);

    players[blinds.dealerIndex].role = 'dealer';
    players[blinds.smallBlindIndex].role = 'sb';
    players[blinds.bigBlindIndex].role = 'bb';

    let pot = 0;
    const postBlind = (idx: number, amount: number) => {
      const actual = Math.min(players[idx].chips, amount);
      players[idx].chips -= actual;
      players[idx].currentBet += actual;
      pot += actual;
    };
    postBlind(blinds.smallBlindIndex, SMALL_BLIND);
    postBlind(blinds.bigBlindIndex, BIG_BLIND);

    for (let i = 0; i < 2; i++) {
       players.forEach(p => {
         if (p.isActive) p.cards.push(deck.pop()!);
       });
    }

    setState(s => ({
      ...s,
      players,
      communityCards: [],
      deck,
      pot,
      currentBet: BIG_BLIND,
      phase: 'pre-flop',
      activePlayerIndex: blinds.utgIndex,
      dealerIndex: blinds.dealerIndex,
      logs: ['New hand started.', `Dealer is ${players[blinds.dealerIndex].name}`]
    }));
  };

  const advancePhase = (s: GameState) => {
    let newPhase: GamePhase = s.phase;
    let newComm = [...s.communityCards];
    let newDeck = [...s.deck];

    if (s.phase === 'pre-flop') {
      newPhase = 'flop';
      newComm.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
    } else if (s.phase === 'flop') {
      newPhase = 'turn';
      newComm.push(newDeck.pop()!);
    } else if (s.phase === 'turn') {
      newPhase = 'river';
      newComm.push(newDeck.pop()!);
    } else if (s.phase === 'river') {
      newPhase = 'showdown';
    }

    const resetPlayers = s.players.map(p => ({
      ...p,
      currentBet: 0,
      action: (p.action === 'fold' || p.action === 'all-in') ? p.action : null
    }));

    const firstToAct = getNextActivePlayer(s.dealerIndex, resetPlayers);

    setState({
      ...s,
      players: resetPlayers,
      communityCards: newComm,
      deck: newDeck,
      phase: newPhase,
      currentBet: 0,
      activePlayerIndex: newPhase === 'showdown' ? -1 : firstToAct
    });
  };

  const handleAction = useCallback((action: 'fold'|'call'|'raise', amount: number = 0) => {
    setState(prev => {
      if (prev.phase === 'showdown' || prev.phase === 'game-over') return prev;

      const pIndex = prev.activePlayerIndex;
      const result = applyAction(prev.players, pIndex, action, amount, prev.pot, prev.currentBet);
      const { updatedPlayers: newPlayers, newPot, newCurrentBet, logMessage: logMsg } = result;

      const notFolded = newPlayers.filter(pl => pl.isActive && pl.action !== 'fold');
      if (notFolded.length === 1) {
        const winner = notFolded[0];
        const updatedWinner = { ...winner, chips: winner.chips + newPot };
        newPlayers[newPlayers.findIndex(pl => pl.id === winner.id)] = updatedWinner;

        setTimeout(() => startNextHand(newPlayers, prev.dealerIndex), 3000);
        return {
          ...prev,
          players: newPlayers,
          pot: 0,
          phase: 'showdown',
          activePlayerIndex: -1,
          logs: [logMsg, `${updatedWinner.name} wins $${newPot} (others folded)!`, ...prev.logs].slice(0, 10)
        };
      }

      if (isRoundOver(newPlayers, newCurrentBet)) {
         setTimeout(() => {
           setState(s => {
             const nextState = { ...s, players: newPlayers, pot: newPot, currentBet: newCurrentBet, logs: [logMsg, ...s.logs].slice(0,10) };
             advancePhase(nextState);
             return s;
           });
         }, 500);
         return { ...prev, players: newPlayers, pot: newPot, currentBet: newCurrentBet, activePlayerIndex: -1, logs: [logMsg, ...prev.logs].slice(0,10) };
      } else {
        const nextActive = getNextActivePlayer(pIndex, newPlayers);
        return { ...prev, players: newPlayers, pot: newPot, currentBet: newCurrentBet, activePlayerIndex: nextActive, logs: [logMsg, ...prev.logs].slice(0,10) };
      }
    });
  }, []);

  useEffect(() => {
    if (state.phase === 'showdown') {
      const activePlayers = state.players.filter(p => p.isActive && p.action !== 'fold');
      if (activePlayers.length > 1) {
        const winResult = determineWinner(state.players, state.communityCards);
        const winAmount = state.pot;

        appendLog(`${winResult.winnerName} wins $${winAmount} with ${winResult.handRankName}`);

        setState(s => {
          const newPlayers = [...s.players];
          const wpIdx = newPlayers.findIndex(p => p.id === winResult.winnerId);
          newPlayers[wpIdx] = { ...newPlayers[wpIdx], chips: newPlayers[wpIdx].chips + winAmount };
          return { ...s, players: newPlayers, pot: 0 };
        });

        setTimeout(() => {
          setState(s => {
            startNextHand(s.players, s.dealerIndex);
            return s;
          });
        }, 5000);
      }
    }
  }, [state.phase]);

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
