import React from 'react';
import type { Player as PlayerType } from '../types';
import { Card } from './Card';

interface PlayerProps {
  player: PlayerType;
  positionClass: string;
  isCurrentTurn: boolean;
}

export const Player: React.FC<PlayerProps> = ({ player, positionClass, isCurrentTurn }) => {
  return (
    <div className={`absolute ${positionClass} flex flex-col items-center gap-2 transition-all duration-300 ${!player.isActive ? 'opacity-50' : ''}`}>
      
      {/* Cards */}
      <div className="flex -space-x-4 mb-1 z-10 mt-1">
        {player.cards.map((card, i) => (
          <div key={i} className="transform hover:-translate-y-2 transition-transform shadow-lg rounded-lg">
            <Card card={card} faceUp={player.isHuman || player.action === 'all-in'} />
          </div>
        ))}
        {/* Placeholder if no cards */}
        {player.cards.length === 0 && (
          <div className="w-14 h-20 sm:w-16 sm:h-24" />
        )}
      </div>

      {/* Player Panel */}
      <div className={`glass-panel p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] text-center relative ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''}`}>
        {/* Role Badge */}
        {player.role && (
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white text-green-900 text-xs font-bold flex items-center justify-center shadow-md">
            {player.role === 'dealer' ? 'D' : player.role === 'sb' ? 'SB' : 'BB'}
          </div>
        )}
        
        {/* Action Badge */}
        {player.action && (
          <div className="absolute -top-3 -left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md shadow-md">
            {player.action}
          </div>
        )}

        <div className="font-medium text-sm text-white/90 truncate">{player.name}</div>
        <div className="text-yellow-400 font-bold text-sm tracking-tight">${player.chips.toLocaleString()}</div>
        
        {/* Bet Amount */}
        {player.currentBet > 0 && (
          <div className="mt-2 text-xs bg-black/30 rounded py-1 border border-white/5">
            Bet: ${player.currentBet.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};
