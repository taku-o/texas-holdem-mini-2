import { useState, useEffect, useCallback } from 'react';
import type { Player, PlayingCard } from '../types';
import { createAndShuffleDeck } from '../utils/deck';
import { evaluateHand } from '../utils/evaluator';

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

const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

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
      dealerIndex: -1, // Will be incremented to 0
      logs: ['Game started!']
    });

    setTimeout(() => startNextHand(initialPlayers, -1), 500);
  }, []);

  const startNextHand = (currentPlayers: Player[], currentDealer: number) => {
    // Filter out bankrupt players (for active status)
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
    let dealer = (currentDealer + 1) % 5;
    while (!players[dealer].isActive) {
      dealer = (dealer + 1) % 5;
    }
    
    let sb = (dealer + 1) % 5;
    while (!players[sb].isActive) sb = (sb + 1) % 5;

    let bb = (sb + 1) % 5;
    while (!players[bb].isActive) bb = (bb + 1) % 5;

    let utg = (bb + 1) % 5;
    while (!players[utg].isActive) utg = (utg + 1) % 5;

    players[dealer].role = 'dealer';
    players[sb].role = 'sb';
    players[bb].role = 'bb';

    // Post blinds
    let pot = 0;
    const postBlind = (idx: number, amount: number) => {
      const actual = Math.min(players[idx].chips, amount);
      players[idx].chips -= actual;
      players[idx].currentBet += actual;
      pot += actual;
    };
    postBlind(sb, SMALL_BLIND);
    postBlind(bb, BIG_BLIND);

    // Deal cards (2 each)
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
      activePlayerIndex: utg,
      dealerIndex: dealer,
      logs: ['New hand started.', `Dealer is ${players[dealer].name}`]
    }));
  };

  const getNextActivePlayer = (currentIndex: number, players: Player[]): number => {
    let next = (currentIndex + 1) % 5;
    while (next !== currentIndex && (!players[next].isActive || players[next].action === 'fold' || players[next].chips === 0)) {
      next = (next + 1) % 5;
    }
    return next;
  };

  const isRoundOver = (players: Player[], currentBet: number): boolean => {
    const activeRemaining = players.filter(p => p.isActive && p.action !== 'fold');
    if (activeRemaining.length === 1) return true;

    // Check if everyone who is not folded or all-in has acted and matched the bet
    const needToAct = activeRemaining.some(p => {
       if (p.chips === 0) return false; // all in
       if (p.action === null) return true; // hasn't acted this round
       if (p.currentBet < currentBet) return true; // hasn't matched bet
       return false;
    });
    return !needToAct;
  };

  const advancePhase = (s: GameState) => {
    let newPhase = s.phase;
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

    let firstToAct = (s.dealerIndex + 1) % 5;
    while (!resetPlayers[firstToAct].isActive || resetPlayers[firstToAct].action === 'fold' || resetPlayers[firstToAct].chips === 0) {
      firstToAct = (firstToAct + 1) % 5;
    }

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
      const player = prev.players[pIndex];
      let newPlayers = [...prev.players];
      let newPot = prev.pot;
      let newCurrentBet = prev.currentBet;
      
      const p = { ...player };

      let logMsg = '';
      if (action === 'fold') {
        p.action = 'fold';
        logMsg = `${p.name} folds.`;
      } else if (action === 'call') {
        const toCall = newCurrentBet - p.currentBet;
        const actualCall = Math.min(p.chips, toCall);
        p.chips -= actualCall;
        p.currentBet += actualCall;
        newPot += actualCall;
        p.action = p.chips === 0 ? 'all-in' : 'call';
        logMsg = `${p.name} calls ${actualCall > 0 ? '$'+actualCall : ''}.`;
      } else if (action === 'raise') {
        const totalToPutIn = amount; // absolute new bet target (math relative to currentBet could be used)
        // Ensure not raising below min
        const raiseAmount = Math.min(p.chips, Math.max(newCurrentBet * 2 || BIG_BLIND, totalToPutIn) - p.currentBet);
        p.chips -= raiseAmount;
        p.currentBet += raiseAmount;
        newPot += raiseAmount;
        newCurrentBet = Math.max(newCurrentBet, p.currentBet);
        p.action = p.chips === 0 ? 'all-in' : 'raise';
        logMsg = `${p.name} raises to $${p.currentBet}.`;
      }

      newPlayers[pIndex] = p;

      // Check if everyone folded
      const notFolded = newPlayers.filter(pl => pl.isActive && pl.action !== 'fold');
      if (notFolded.length === 1) {
        // Round ends immediately, winner is the only one left
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
             return s; // The advancePhase handles the state commit
           });
         }, 500);
         return { ...prev, players: newPlayers, pot: newPot, currentBet: newCurrentBet, activePlayerIndex: -1, logs: [logMsg, ...prev.logs].slice(0,10) };
      } else {
        const nextActive = getNextActivePlayer(pIndex, newPlayers);
        return { ...prev, players: newPlayers, pot: newPot, currentBet: newCurrentBet, activePlayerIndex: nextActive, logs: [logMsg, ...prev.logs].slice(0,10) };
      }
    });
  }, []);

  // Showdown Phase evaluation
  useEffect(() => {
    if (state.phase === 'showdown') {
      const activePlayers = state.players.filter(p => p.isActive && p.action !== 'fold');
      if (activePlayers.length > 1) {
        const results = activePlayers.map(p => ({
          player: p,
          eval: evaluateHand(p.cards, state.communityCards)
        }));
        
        results.sort((a, b) => b.eval.score - a.eval.score);
        
        const winner = results[0];
        const winAmount = state.pot;
        
        appendLog(`${winner.player.name} wins $${winAmount} with ${winner.eval.rankName}`);
        
        setState(s => {
          const newPlayers = [...s.players];
          const wpIdx = newPlayers.findIndex(p => p.id === winner.player.id);
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

  // CPU AI
  useEffect(() => {
    if (state.activePlayerIndex !== -1) {
      const active = state.players[state.activePlayerIndex];
      if (!active.isHuman && state.phase !== 'showdown' && state.phase !== 'idle' && state.phase !== 'game-over') {
        const timer = setTimeout(() => {
          const toCall = state.currentBet - active.currentBet;
          const random = Math.random();
          
          if (toCall === 0) {
            if (random < 0.2 && active.chips > BIG_BLIND) handleAction('raise', state.currentBet + BIG_BLIND);
            else handleAction('call'); // Check
          } else {
            if (random < 0.15) handleAction('fold');
            else if (random < 0.3 && active.chips > state.currentBet * 2) handleAction('raise', state.currentBet * 2);
            else handleAction('call'); // Call
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.activePlayerIndex, state.phase, state.currentBet, state.players, handleAction]);

  return { state, startGame, handleAction };
};
